import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { previousDay, vnDay, vnDayStart } from '../common/vn-day';

/**
 * Thưởng giữ chân người đọc: điểm danh, nhiệm vụ ngày, mời bạn, giftcode.
 *
 * Mọi phần thưởng là XU THƯỞNG (UserWallet.bonusBalance): chỉ dùng mua
 * chương / truyện VIP, phần đó không chia cho tác giả (WalletService.
 * debitForPaidContent) → farm nhiều tài khoản cũng không rút ra tiền được.
 */

export type MissionKey = 'read' | 'listen' | 'comment';

interface MissionConfig {
    key: MissionKey;
    target: number;
    reward: number;
}

const MISSION_LABELS: Record<MissionKey, (target: number) => string> = {
    read: (n) => `Đọc hết ${n} chương`,
    listen: (n) => `Nghe ${n} chương`,
    comment: (n) => `Bình luận ${n} lần`,
};

const DEFAULT_CHECKIN = [2, 2, 3, 3, 5, 5, 10];
const DEFAULT_MISSIONS: MissionConfig[] = [
    { key: 'read', target: 3, reward: 5 },
    { key: 'listen', target: 1, reward: 3 },
    { key: 'comment', target: 1, reward: 2 },
];
/** Trần an toàn cho mỗi lần thưởng (chặn admin gõ nhầm số quá lớn). */
const MAX_SINGLE_REWARD = 10_000;
/** Chỉ gắn người mời trong vòng N ngày đầu sau khi tạo tài khoản. */
const REFERRAL_ATTACH_WINDOW_DAYS = 7;
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm

function toInt(v: unknown, min: number, max: number): number | null {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) return null;
    return n;
}

@Injectable()
export class RewardsService {
    private readonly logger = new Logger(RewardsService.name);

    constructor(
        private prisma: PrismaService,
        private wallet: WalletService,
    ) { }

    // ─── Cấu hình (Settings) ───────────────────────────────────────────────

    private async getConfig() {
        const s: any = (await this.prisma.settings.findFirst()) || {};
        const checkin = Array.isArray(s.checkinRewards)
            ? s.checkinRewards.map((v: unknown) => toInt(v, 0, MAX_SINGLE_REWARD)).filter((v: number | null) => v !== null) as number[]
            : [];
        const missions: MissionConfig[] = Array.isArray(s.dailyMissions)
            ? s.dailyMissions
                .map((m: any) => ({
                    key: m?.key,
                    target: toInt(m?.target, 1, 100),
                    reward: toInt(m?.reward, 0, MAX_SINGLE_REWARD),
                }))
                .filter((m: any) => (m.key === 'read' || m.key === 'listen' || m.key === 'comment') && m.target !== null && m.reward !== null)
            : [];
        return {
            enabled: s.rewardsEnabled ?? true,
            checkinRewards: checkin.length > 0 ? checkin : (s.checkinRewards ? [] : DEFAULT_CHECKIN),
            missions: s.dailyMissions ? missions : DEFAULT_MISSIONS,
            referralEnabled: s.referralEnabled ?? true,
            referralRewardReferrer: toInt(s.referralRewardReferrer, 0, MAX_SINGLE_REWARD) ?? 20,
            referralRewardReferee: toInt(s.referralRewardReferee, 0, MAX_SINGLE_REWARD) ?? 10,
            referralMonthlyCap: toInt(s.referralMonthlyCap, 0, 10_000) ?? 20,
        };
    }

    private static rewardForStreak(rewards: number[], streak: number): number {
        if (rewards.length === 0) return 0;
        return rewards[(streak - 1) % rewards.length];
    }

    private async assertEligibleUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, deletedAt: true },
        });
        if (!user || !user.isActive || user.deletedAt) {
            throw new BadRequestException('Tài khoản không đủ điều kiện nhận thưởng');
        }
    }

    // ─── Ghi hoạt động (gọi từ module khác) ───────────────────────────────

    /** Đếm tiến độ nhiệm vụ hôm nay của user. */
    private async missionProgress(userId: string, day: string): Promise<Record<MissionKey, number>> {
        const since = vnDayStart(day);
        const [read, listenRows, comment] = await Promise.all([
            this.prisma.userDailyActivity.count({ where: { userId, day, kind: 'read' } }),
            this.prisma.audioListen.findMany({
                where: { userId, createdAt: { gte: since } },
                select: { chapterId: true },
                distinct: ['chapterId'],
            }),
            this.prisma.comment.count({ where: { userId, createdAt: { gte: since } } }),
        ]);
        return { read, listen: listenRows.length, comment };
    }

    // ─── Trạng thái tổng hợp cho trang Nhiệm vụ ───────────────────────────

    async getStatus(userId: string) {
        const cfg = await this.getConfig();
        const day = vnDay();
        const yesterday = previousDay(day);

        const [todayCheckIn, lastCheckIn, claims, progress, wallet, user, invitedCount, rewardedCount] =
            await Promise.all([
                this.prisma.dailyCheckIn.findUnique({ where: { userId_day: { userId, day } } }),
                this.prisma.dailyCheckIn.findFirst({ where: { userId }, orderBy: { day: 'desc' } }),
                this.prisma.userMissionClaim.findMany({ where: { userId, day }, select: { missionKey: true } }),
                this.missionProgress(userId, day),
                this.wallet.getBalance(userId),
                this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
                this.prisma.user.count({ where: { referredById: userId } }),
                this.prisma.user.count({ where: { referredById: userId, referralRewardedAt: { not: null } } }),
            ]);

        // Chuỗi hiện tại: tính đến hôm nay (nếu đã điểm danh) hoặc hôm qua.
        const streakAlive = lastCheckIn && (lastCheckIn.day === day || lastCheckIn.day === yesterday);
        const currentStreak = streakAlive ? lastCheckIn!.streak : 0;
        // Lần điểm danh kế tiếp (hôm nay nếu chưa, hoặc ngày mai) là ngày thứ currentStreak + 1.
        const nextStreak = currentStreak + 1;
        const claimed = new Set(claims.map((c) => c.missionKey));

        return {
            enabled: cfg.enabled,
            day,
            bonusBalance: wallet.bonusBalance,
            checkIn: {
                checkedInToday: !!todayCheckIn,
                todayReward: todayCheckIn?.reward ?? null,
                streak: currentStreak,
                nextReward: RewardsService.rewardForStreak(cfg.checkinRewards, nextStreak),
                schedule: cfg.checkinRewards,
            },
            missions: cfg.missions.map((m) => ({
                key: m.key,
                label: MISSION_LABELS[m.key](m.target),
                target: m.target,
                progress: Math.min(m.target, progress[m.key]),
                reward: m.reward,
                claimed: claimed.has(m.key),
            })),
            referral: {
                enabled: cfg.referralEnabled,
                code: user?.referralCode ?? null,
                rewardReferrer: cfg.referralRewardReferrer,
                rewardReferee: cfg.referralRewardReferee,
                invitedCount,
                rewardedCount,
            },
        };
    }

    // ─── Điểm danh ─────────────────────────────────────────────────────────

    async checkIn(userId: string) {
        const cfg = await this.getConfig();
        if (!cfg.enabled) throw new BadRequestException('Tính năng thưởng đang tạm tắt');
        await this.assertEligibleUser(userId);

        const day = vnDay();
        const yesterday = previousDay(day);

        let result: { streak: number; reward: number };
        try {
            result = await this.prisma.$transaction(async (tx) => {
                const prev = await tx.dailyCheckIn.findUnique({
                    where: { userId_day: { userId, day: yesterday } },
                });
                const streak = prev ? prev.streak + 1 : 1;
                const reward = RewardsService.rewardForStreak(cfg.checkinRewards, streak);
                // unique(userId, day) chặn điểm danh 2 lần (kể cả 2 request song song).
                await tx.dailyCheckIn.create({ data: { userId, day, streak, reward } });
                if (reward > 0) {
                    await this.wallet.creditBonus(
                        tx, userId, reward, TransactionType.CHECKIN_REWARD,
                        `Điểm danh ngày ${streak} liên tiếp: +${reward} xu thưởng`,
                    );
                }
                return { streak, reward };
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new BadRequestException('Hôm nay bạn đã điểm danh rồi');
            }
            throw e;
        }

        // Lần điểm danh đầu của người được mời → trả thưởng mời bạn (best-effort).
        this.maybeRewardReferral(userId).catch((err) =>
            this.logger.warn(`Referral reward failed for ${userId}: ${err?.message || err}`),
        );
        return result;
    }

    // ─── Nhiệm vụ ngày ─────────────────────────────────────────────────────

    async claimMission(userId: string, key: string) {
        const cfg = await this.getConfig();
        if (!cfg.enabled) throw new BadRequestException('Tính năng thưởng đang tạm tắt');
        const mission = cfg.missions.find((m) => m.key === key);
        if (!mission) throw new NotFoundException('Nhiệm vụ không tồn tại');
        await this.assertEligibleUser(userId);

        const day = vnDay();
        const progress = await this.missionProgress(userId, day);
        if (progress[mission.key] < mission.target) {
            throw new BadRequestException('Bạn chưa hoàn thành nhiệm vụ này');
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.userMissionClaim.create({
                    data: { userId, day, missionKey: mission.key, reward: mission.reward },
                });
                if (mission.reward > 0) {
                    await this.wallet.creditBonus(
                        tx, userId, mission.reward, TransactionType.MISSION_REWARD,
                        `Nhiệm vụ "${MISSION_LABELS[mission.key](mission.target)}": +${mission.reward} xu thưởng`,
                    );
                }
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new BadRequestException('Bạn đã nhận thưởng nhiệm vụ này hôm nay');
            }
            throw e;
        }
        return { reward: mission.reward };
    }

    // ─── Mời bạn bè ────────────────────────────────────────────────────────

    private static randomCode(len = 8): string {
        const bytes = randomBytes(len);
        let out = '';
        for (let i = 0; i < len; i++) out += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
        return out;
    }

    /** Lấy (hoặc sinh lần đầu) mã mời của user. */
    async ensureReferralCode(userId: string): Promise<string> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
        if (user?.referralCode) return user.referralCode;
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = RewardsService.randomCode();
            try {
                const updated = await this.prisma.user.updateMany({
                    where: { id: userId, referralCode: null },
                    data: { referralCode: code },
                });
                if (updated.count === 0) {
                    // Request khác vừa sinh mã — đọc lại.
                    const again = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
                    if (again?.referralCode) return again.referralCode;
                }
                return code;
            } catch (e) {
                if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue; // trùng mã → thử lại
                throw e;
            }
        }
        throw new BadRequestException('Không tạo được mã mời, vui lòng thử lại');
    }

    /**
     * Gắn người mời cho tài khoản MỚI (≤ 7 ngày tuổi, chưa có người mời).
     * Gọi từ client sau khi đăng ký/đăng nhập lần đầu với ?ref=MA đã lưu.
     */
    async attachReferrer(userId: string, rawCode: string) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) throw new BadRequestException('Mã mời không hợp lệ');
        const [me, referrer] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, createdAt: true, referredById: true, referralCode: true },
            }),
            this.prisma.user.findUnique({
                where: { referralCode: code },
                select: { id: true, createdAt: true, isActive: true, deletedAt: true },
            }),
        ]);
        if (!me) throw new NotFoundException('Không tìm thấy tài khoản');
        if (me.referredById) return { attached: false, reason: 'already' };
        if (!referrer || !referrer.isActive || referrer.deletedAt) {
            throw new BadRequestException('Mã mời không tồn tại');
        }
        if (referrer.id === me.id) throw new BadRequestException('Không thể tự mời chính mình');
        const ageMs = Date.now() - me.createdAt.getTime();
        if (ageMs > REFERRAL_ATTACH_WINDOW_DAYS * 86_400_000) {
            throw new BadRequestException('Chỉ tài khoản mới tạo mới nhập được mã mời');
        }
        if (referrer.createdAt >= me.createdAt) {
            throw new BadRequestException('Mã mời không hợp lệ cho tài khoản này');
        }
        await this.prisma.user.updateMany({
            where: { id: me.id, referredById: null },
            data: { referredById: referrer.id },
        });
        return { attached: true };
    }

    /**
     * Trả thưởng mời bạn đúng 1 lần cho cặp (người mời, người được mời), khi
     * người được mời điểm danh lần đầu (tức là đã thật sự dùng web). Người
     * mời bị giới hạn số lượt thưởng / 30 ngày; người được mời luôn nhận.
     */
    private async maybeRewardReferral(userId: string) {
        const cfg = await this.getConfig();
        if (!cfg.enabled || !cfg.referralEnabled) return;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { referredById: true, referralRewardedAt: true, emailVerified: true, username: true, displayName: true },
        });
        if (!user?.referredById || user.referralRewardedAt || !user.emailVerified) return;
        const referrerId = user.referredById;

        const since = new Date(Date.now() - 30 * 86_400_000);
        const recentRewarded = await this.prisma.user.count({
            where: { referredById: referrerId, referralRewardedAt: { gte: since } },
        });
        const referrerGetsReward = cfg.referralRewardReferrer > 0 && recentRewarded < cfg.referralMonthlyCap;
        const name = user.displayName || user.username;

        await this.prisma.$transaction(async (tx) => {
            // Chiếm cờ atomically — chặn trả 2 lần khi 2 request chạy song song.
            const claimed = await tx.user.updateMany({
                where: { id: userId, referralRewardedAt: null },
                data: { referralRewardedAt: new Date() },
            });
            if (claimed.count === 0) return;
            if (cfg.referralRewardReferee > 0) {
                await this.wallet.creditBonus(
                    tx, userId, cfg.referralRewardReferee, TransactionType.REFERRAL_REWARD,
                    `Thưởng tham gia qua lời mời: +${cfg.referralRewardReferee} xu thưởng`, referrerId,
                );
            }
            if (referrerGetsReward) {
                await this.wallet.creditBonus(
                    tx, referrerId, cfg.referralRewardReferrer, TransactionType.REFERRAL_REWARD,
                    `Mời bạn ${name} thành công: +${cfg.referralRewardReferrer} xu thưởng`, userId,
                );
            }
        });
    }

    // ─── Giftcode ──────────────────────────────────────────────────────────

    async redeemGiftCode(userId: string, rawCode: string) {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code || code.length > 64) throw new BadRequestException('Mã quà tặng không hợp lệ');
        const cfg = await this.getConfig();
        if (!cfg.enabled) throw new BadRequestException('Tính năng thưởng đang tạm tắt');
        await this.assertEligibleUser(userId);

        const gift = await this.prisma.giftCode.findUnique({ where: { code } });
        if (!gift || !gift.isActive) throw new BadRequestException('Mã quà tặng không tồn tại hoặc đã tắt');
        if (gift.expiresAt && gift.expiresAt.getTime() < Date.now()) {
            throw new BadRequestException('Mã quà tặng đã hết hạn');
        }
        const used = await this.prisma.giftCodeRedemption.findUnique({
            where: { giftCodeId_userId: { giftCodeId: gift.id, userId } },
        });
        if (used) throw new BadRequestException('Bạn đã dùng mã này rồi');

        try {
            await this.prisma.$transaction(async (tx) => {
                // Tăng lượt dùng có điều kiện (race-safe với maxUses).
                const affected = gift.maxUses === null
                    ? await tx.giftCode.updateMany({ where: { id: gift.id }, data: { usedCount: { increment: 1 } } })
                    : await tx.giftCode.updateMany({
                        where: { id: gift.id, usedCount: { lt: gift.maxUses } },
                        data: { usedCount: { increment: 1 } },
                    });
                if (affected.count === 0) throw new BadRequestException('Mã quà tặng đã hết lượt');
                await tx.giftCodeRedemption.create({ data: { giftCodeId: gift.id, userId, reward: gift.reward } });
                await this.wallet.creditBonus(
                    tx, userId, gift.reward, TransactionType.GIFTCODE_REWARD,
                    `Nhập mã ${gift.code}: +${gift.reward} xu thưởng`, gift.id,
                );
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new BadRequestException('Bạn đã dùng mã này rồi');
            }
            throw e;
        }
        return { reward: gift.reward };
    }

    // Admin
    async listGiftCodes() {
        return this.prisma.giftCode.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: { createdBy: { select: { username: true, displayName: true } } },
        });
    }

    async createGiftCode(adminId: string, dto: { code?: string; reward: number; maxUses?: number | null; expiresAt?: string | null; note?: string | null }) {
        const code = (dto.code ? String(dto.code) : RewardsService.randomCode(10)).trim().toUpperCase();
        if (!/^[A-Z0-9_-]{4,64}$/.test(code)) {
            throw new BadRequestException('Mã chỉ gồm chữ, số, gạch ngang/gạch dưới (4–64 ký tự)');
        }
        try {
            return await this.prisma.giftCode.create({
                data: {
                    code,
                    reward: dto.reward,
                    maxUses: dto.maxUses ?? null,
                    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                    note: dto.note || null,
                    createdById: adminId,
                },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new BadRequestException('Mã này đã tồn tại');
            }
            throw e;
        }
    }

    async setGiftCodeActive(id: string, isActive: boolean) {
        const gift = await this.prisma.giftCode.findUnique({ where: { id } });
        if (!gift) throw new NotFoundException('Không tìm thấy mã');
        return this.prisma.giftCode.update({ where: { id }, data: { isActive } });
    }
}
