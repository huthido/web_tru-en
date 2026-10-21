import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, Prisma, SponsorApprovalStatus, SponsorClaimStatus, SponsorRewardType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from './rewards.service';
import { vnDay } from '../common/vn-day';

/**
 * Quỹ thưởng tài trợ (pha 1: admin tạo quỹ). Không đụng ví xu — phần thưởng là
 * hiện vật / tiền mặt do nhà tài trợ tự trao, hoặc mở khoá truyện miễn phí.
 */

/** Tài khoản phải đủ tuổi mới nhận thưởng thật (chặn đăng ký hàng loạt để săn quà). */
const MIN_ACCOUNT_AGE_DAYS = 3;

export interface SponsorProgramInput {
    title: string;
    description?: string | null;
    sponsorName: string;
    sponsorLogo?: string | null;
    rewardType: SponsorRewardType;
    rewardNote: string;
    storyId?: string | null;
    slots: number;
    requiredCheckinDays: number;
    requiredMissionDays: number;
    startsAt: string;
    endsAt: string;
}

@Injectable()
export class SponsorService {
    private readonly logger = new Logger(SponsorService.name);

    constructor(
        private prisma: PrismaService,
        private rewards: RewardsService,
        // Optional: thiếu NotificationsModule thì quỹ vẫn chạy, chỉ không báo.
        @Optional() private notifications?: NotificationsService,
    ) { }

    /** Báo cho user, nuốt lỗi — thông báo hỏng không được làm hỏng thao tác chính. */
    private async notify(userId: string, title: string, content: string, actionUrl: string) {
        try {
            await this.notifications?.notifyUser(userId, { title, content, type: NotificationType.INFO, actionUrl });
        } catch (e: any) {
            this.logger.warn(`Gửi thông báo quỹ tài trợ lỗi: ${e?.message ?? e}`);
        }
    }

    /** Số ngày điểm danh + số ngày làm đủ nhiệm vụ của user trong khoảng chương trình. */
    private async progressFor(userId: string, p: { startsAt: Date; endsAt: Date }, missionCount: number) {
        const from = vnDay(p.startsAt);
        const now = new Date();
        const to = vnDay(now < p.endsAt ? now : p.endsAt);
        const range = { gte: from, lte: to };
        const [checkinDays, claimRows] = await Promise.all([
            this.prisma.dailyCheckIn.count({ where: { userId, day: range } }),
            this.prisma.userMissionClaim.groupBy({
                by: ['day'],
                where: { userId, day: range },
                _count: { _all: true },
            }),
        ]);
        const missionDays = missionCount > 0
            ? claimRows.filter((r) => r._count._all >= missionCount).length
            : 0;
        return { checkinDays, missionDays };
    }

    private phase(p: { isActive: boolean; startsAt: Date; endsAt: Date; slots: number; claimedCount: number }) {
        const now = new Date();
        if (!p.isActive) return 'off';
        if (p.claimedCount >= p.slots) return 'full';
        if (now < p.startsAt) return 'upcoming';
        if (now > p.endsAt) return 'ended';
        return 'running';
    }

    // ─── Người dùng ────────────────────────────────────────────────────────

    /** Quỹ đang hiển thị + tiến độ của user. */
    async listForUser(userId: string) {
        const programs = await this.prisma.sponsorProgram.findMany({
            where: { isActive: true, approvalStatus: SponsorApprovalStatus.APPROVED, endsAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
            orderBy: { endsAt: 'asc' },
            include: { story: { select: { id: true, title: true, slug: true, coverImage: true } } },
        });
        const missionCount = await this.rewards.getMissionCount();
        const mine = await this.prisma.sponsorClaim.findMany({
            where: { userId, programId: { in: programs.map((p) => p.id) } },
        });
        const claimByProgram = new Map(mine.map((c) => [c.programId, c]));

        return Promise.all(programs.map(async (p) => {
            const progress = await this.progressFor(userId, p, missionCount);
            const claim = claimByProgram.get(p.id) ?? null;
            const phase = this.phase(p);
            const eligible = progress.checkinDays >= p.requiredCheckinDays
                && progress.missionDays >= p.requiredMissionDays;
            return {
                id: p.id,
                title: p.title,
                description: p.description,
                sponsorName: p.sponsorName,
                sponsorLogo: p.sponsorLogo,
                rewardType: p.rewardType,
                rewardNote: p.rewardNote,
                story: p.story,
                slots: p.slots,
                claimedCount: p.claimedCount,
                requiredCheckinDays: p.requiredCheckinDays,
                requiredMissionDays: p.requiredMissionDays,
                startsAt: p.startsAt,
                endsAt: p.endsAt,
                phase,
                progress,
                canClaim: !claim && eligible && phase === 'running'
                    && (p.rewardType !== SponsorRewardType.STORY_ACCESS || !!p.storyId),
                claim: claim ? { status: claim.status, createdAt: claim.createdAt } : null,
            };
        }));
    }

    async claim(userId: string, programId: string, contact?: string | null) {
        const [program, user, missionCount] = await Promise.all([
            this.prisma.sponsorProgram.findUnique({ where: { id: programId } }),
            this.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, deletedAt: true, createdAt: true } }),
            this.rewards.getMissionCount(),
        ]);
        if (!program || program.approvalStatus !== SponsorApprovalStatus.APPROVED) throw new NotFoundException('Không tìm thấy chương trình');
        if (!user || !user.isActive || user.deletedAt) throw new BadRequestException('Tài khoản không đủ điều kiện nhận thưởng');
        if (Date.now() - user.createdAt.getTime() < MIN_ACCOUNT_AGE_DAYS * 86400_000) {
            throw new BadRequestException(`Tài khoản cần tồn tại tối thiểu ${MIN_ACCOUNT_AGE_DAYS} ngày để nhận thưởng tài trợ`);
        }
        const phase = this.phase(program);
        if (phase === 'full') throw new BadRequestException('Chương trình đã hết suất');
        if (phase !== 'running') throw new BadRequestException('Chương trình chưa mở hoặc đã kết thúc');

        const progress = await this.progressFor(userId, program, missionCount);
        if (progress.checkinDays < program.requiredCheckinDays || progress.missionDays < program.requiredMissionDays) {
            throw new BadRequestException('Bạn chưa đủ điều kiện nhận thưởng');
        }

        const isStory = program.rewardType === SponsorRewardType.STORY_ACCESS;
        // Truyện bị xoá thì storyId về NULL (onDelete SetNull) — không được phát suất mà không mở khoá gì.
        if (isStory && !program.storyId) throw new BadRequestException('Truyện được tặng không còn tồn tại');
        const cleanContact = (contact ?? '').trim();
        if (!isStory && cleanContact.length < 6) {
            throw new BadRequestException('Vui lòng nhập thông tin nhận thưởng (địa chỉ / tài khoản / số điện thoại)');
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                // Giữ suất nguyên tử: chỉ tăng khi còn chỗ (2 người cùng nhận suất cuối → 1 người thua).
                const taken = await tx.$executeRaw(Prisma.sql`
                    UPDATE "sponsor_programs" SET "claimedCount" = "claimedCount" + 1
                    WHERE "id" = ${programId} AND "claimedCount" < "slots"`);
                if (taken === 0) throw new BadRequestException('Chương trình đã hết suất');

                // unique(programId, userId) chặn nhận 2 lần → rollback luôn cả bước giữ suất.
                await tx.sponsorClaim.create({
                    data: {
                        programId,
                        userId,
                        contact: isStory ? null : cleanContact.slice(0, 500),
                        status: isStory ? SponsorClaimStatus.FULFILLED : SponsorClaimStatus.PENDING,
                        fulfilledAt: isStory ? new Date() : null,
                    },
                });
                if (isStory && program.storyId) {
                    await tx.storyPurchase.upsert({
                        where: { userId_storyId: { userId, storyId: program.storyId } },
                        update: {},
                        create: { userId, storyId: program.storyId, pricePaid: 0, platformFee: 0, netAmount: 0, bonusPaid: 0 },
                    });
                }
            });
        } catch (e: any) {
            if (e?.code === 'P2002') throw new ConflictException('Bạn đã nhận thưởng chương trình này rồi');
            throw e;
        }
        if (program.submittedById && program.submittedById !== userId) {
            void this.notify(
                program.submittedById,
                'Có người nhận thưởng chương trình của bạn',
                `Một thành viên vừa nhận suất trong "${program.title}". Xem thông tin nhận thưởng và trao quà.`,
                '/tai-tro',
            );
        }
        return { ok: true, rewardType: program.rewardType };
    }

    // ─── Admin ─────────────────────────────────────────────────────────────

    private validate(dto: SponsorProgramInput) {
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
            throw new BadRequestException('Thời gian chương trình không hợp lệ');
        }
        if (dto.rewardType === SponsorRewardType.STORY_ACCESS && !dto.storyId) {
            throw new BadRequestException('Thưởng tặng truyện cần chọn truyện');
        }
        return {
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            sponsorName: dto.sponsorName.trim(),
            sponsorLogo: dto.sponsorLogo?.trim() || null,
            rewardType: dto.rewardType,
            rewardNote: dto.rewardNote.trim(),
            storyId: dto.rewardType === SponsorRewardType.STORY_ACCESS ? dto.storyId! : null,
            slots: dto.slots,
            requiredCheckinDays: dto.requiredCheckinDays,
            requiredMissionDays: dto.requiredMissionDays,
            startsAt,
            endsAt,
        };
    }

    adminList() {
        return this.prisma.sponsorProgram.findMany({
            orderBy: [{ approvalStatus: 'asc' }, { createdAt: 'desc' }],
            include: {
                story: { select: { id: true, title: true } },
                submittedBy: { select: { id: true, username: true, displayName: true, email: true } },
            },
        });
    }

    async adminCreate(adminId: string, dto: SponsorProgramInput) {
        const data = this.validate(dto);
        if (data.storyId) {
            const story = await this.prisma.story.findFirst({
                where: { OR: [{ id: data.storyId }, { slug: data.storyId }] },
                select: { id: true },
            });
            if (!story) throw new BadRequestException('Không tìm thấy truyện');
            data.storyId = story.id;
        }
        return this.prisma.sponsorProgram.create({ data: { ...data, createdById: adminId } });
    }

    async adminUpdate(id: string, dto: SponsorProgramInput) {
        const existing = await this.prisma.sponsorProgram.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Không tìm thấy chương trình');
        const data = this.validate(dto);
        if (data.slots < existing.claimedCount) {
            throw new BadRequestException(`Số suất không được nhỏ hơn số đã nhận (${existing.claimedCount})`);
        }
        if (data.storyId) {
            const story = await this.prisma.story.findFirst({
                where: { OR: [{ id: data.storyId }, { slug: data.storyId }] },
                select: { id: true },
            });
            if (!story) throw new BadRequestException('Không tìm thấy truyện');
            data.storyId = story.id;
        }
        return this.prisma.sponsorProgram.update({ where: { id }, data });
    }

    async adminSetActive(id: string, isActive: boolean) {
        const r = await this.prisma.sponsorProgram.updateMany({ where: { id }, data: { isActive } });
        if (r.count === 0) throw new NotFoundException('Không tìm thấy chương trình');
        return { ok: true };
    }

    async adminApprove(id: string) {
        const p = await this.prisma.sponsorProgram.findUnique({ where: { id } });
        if (!p) throw new NotFoundException('Không tìm thấy chương trình');
        await this.prisma.sponsorProgram.update({
            where: { id },
            data: { approvalStatus: SponsorApprovalStatus.APPROVED, isActive: true, rejectReason: null },
        });
        if (p.submittedById) {
            void this.notify(p.submittedById, 'Chương trình tài trợ đã được duyệt',
                `"${p.title}" đã được duyệt và hiển thị cho người dùng.`, '/tai-tro');
        }
        return { ok: true };
    }

    async adminReject(id: string, reason: string) {
        const p = await this.prisma.sponsorProgram.findUnique({ where: { id } });
        if (!p) throw new NotFoundException('Không tìm thấy chương trình');
        await this.prisma.sponsorProgram.update({
            where: { id },
            data: { approvalStatus: SponsorApprovalStatus.REJECTED, isActive: false, rejectReason: reason.trim() || null },
        });
        if (p.submittedById) {
            void this.notify(p.submittedById, 'Chương trình tài trợ chưa được duyệt',
                `"${p.title}": ${reason.trim() || 'không đạt yêu cầu'}.`, '/tai-tro');
        }
        return { ok: true };
    }

    // ─── Nhà tài trợ (người dùng gửi đề xuất) ──────────────────────────────

    async propose(userId: string, dto: SponsorProgramInput & { contactInfo: string }) {
        const pending = await this.prisma.sponsorProgram.count({
            where: { submittedById: userId, approvalStatus: SponsorApprovalStatus.PENDING },
        });
        if (pending >= 3) throw new BadRequestException('Bạn đang có 3 đề xuất chờ duyệt, vui lòng đợi admin xử lý');
        const data = this.validate(dto);
        // Logo là URL ảnh hiển thị cho mọi người dùng → chỉ admin được đặt, tránh ảnh theo dõi / không phù hợp lọt qua.
        data.sponsorLogo = null;
        if (data.endsAt <= new Date()) throw new BadRequestException('Thời gian kết thúc phải ở tương lai');
        if (data.storyId) {
            // Người dùng thường chỉ được tặng truyện CỦA MÌNH.
            const story = await this.prisma.story.findFirst({
                where: { OR: [{ id: data.storyId }, { slug: data.storyId }], authorId: userId },
                select: { id: true },
            });
            if (!story) throw new BadRequestException('Chỉ được tặng truyện do chính bạn đăng');
            data.storyId = story.id;
        }
        return this.prisma.sponsorProgram.create({
            data: {
                ...data,
                submittedById: userId,
                contactInfo: dto.contactInfo.trim(),
                approvalStatus: SponsorApprovalStatus.PENDING,
                isActive: false,
            },
        });
    }

    /** Đề xuất của tôi + trạng thái duyệt. */
    mine(userId: string) {
        return this.prisma.sponsorProgram.findMany({
            where: { submittedById: userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, title: true, rewardType: true, rewardNote: true, slots: true, claimedCount: true,
                startsAt: true, endsAt: true, approvalStatus: true, rejectReason: true, isActive: true,
            },
        });
    }

    private async assertOwner(userId: string, programId: string) {
        const p = await this.prisma.sponsorProgram.findUnique({ where: { id: programId }, select: { submittedById: true } });
        if (!p) throw new NotFoundException('Không tìm thấy chương trình');
        if (p.submittedById !== userId) throw new ForbiddenException('Bạn không phải nhà tài trợ của chương trình này');
    }

    /** Người nhận thưởng — nhà tài trợ cần địa chỉ/tài khoản để trao; không lộ email. */
    async ownerClaims(userId: string, programId: string) {
        await this.assertOwner(userId, programId);
        return this.prisma.sponsorClaim.findMany({
            where: { programId },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true, contact: true, status: true, createdAt: true,
                user: { select: { username: true, displayName: true } },
            },
        });
    }

    async ownerFulfill(userId: string, claimId: string) {
        const claim = await this.prisma.sponsorClaim.findUnique({
            where: { id: claimId },
            select: { programId: true },
        });
        if (!claim) throw new NotFoundException('Không có suất chờ trao');
        await this.assertOwner(userId, claim.programId);
        return this.adminFulfill(claimId);
    }

    // ─── Thông báo định kỳ (20:00 giờ VN) ─────────────────────────────────

    /**
     * Báo user "đã đủ điều kiện nhận thưởng" và (khi còn ≤ 2 ngày) "sắp hết hạn,
     * bạn mới đạt X/Y". Mỗi loại một lần/quỹ/người (bảng sponsor_notices).
     */
    @Cron('0 13 * * *')
    async notifyProgress() {
        try {
            const now = new Date();
            const programs = await this.prisma.sponsorProgram.findMany({
                where: { isActive: true, approvalStatus: SponsorApprovalStatus.APPROVED, startsAt: { lte: now }, endsAt: { gt: now } },
            });
            const missionCount = await this.rewards.getMissionCount();
            for (const p of programs) {
                if (p.claimedCount >= p.slots) continue;
                if (p.requiredCheckinDays === 0 && p.requiredMissionDays === 0) continue;
                await this.notifyProgram(p, missionCount, now);
            }
        } catch (e: any) {
            this.logger.warn(`notifyProgress lỗi: ${e?.message ?? e}`);
        }
    }

    private async notifyProgram(
        p: { id: string; title: string; startsAt: Date; endsAt: Date; requiredCheckinDays: number; requiredMissionDays: number },
        missionCount: number,
        now: Date,
    ) {
        const from = vnDay(p.startsAt);
        const to = vnDay(now);
        const endingSoon = p.endsAt.getTime() - now.getTime() <= 2 * 86400_000;

        // Ứng viên: người đã điểm danh ít nhất 1 ngày trong kỳ (trần 5000 để job nhẹ).
        const checkins = await this.prisma.dailyCheckIn.groupBy({
            by: ['userId'],
            where: { day: { gte: from, lte: to } },
            _count: { _all: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 5000,
        });
        if (checkins.length === 0) return;
        // Chỉ báo người thực sự nhận được (cùng điều kiện với claim): tài khoản còn hoạt động và đủ tuổi.
        const allowed = await this.prisma.user.findMany({
            where: {
                id: { in: checkins.map((c) => c.userId) },
                isActive: true,
                deletedAt: null,
                createdAt: { lte: new Date(now.getTime() - MIN_ACCOUNT_AGE_DAYS * 86400_000) },
            },
            select: { id: true },
        });
        const allowedSet = new Set(allowed.map((u) => u.id));
        const eligibleRows = checkins.filter((c) => allowedSet.has(c.userId));
        if (eligibleRows.length === 0) return;
        const ids = eligibleRows.map((c) => c.userId);
        const checkinDays = new Map(eligibleRows.map((c) => [c.userId, c._count._all]));

        const missionRows = await this.prisma.$queryRaw<{ userId: string; days: bigint }[]>(Prisma.sql`
            SELECT "userId", COUNT(*) AS days FROM (
                SELECT "userId", "day" FROM "user_mission_claims"
                WHERE "day" >= ${from} AND "day" <= ${to} AND "userId" IN (${Prisma.join(ids)})
                GROUP BY "userId", "day" HAVING COUNT(*) >= ${missionCount}
            ) t GROUP BY "userId"`);
        const missionDays = new Map(missionRows.map((r) => [r.userId, Number(r.days)]));

        const [claimed, noticed] = await Promise.all([
            this.prisma.sponsorClaim.findMany({ where: { programId: p.id }, select: { userId: true } }),
            this.prisma.sponsorNotice.findMany({ where: { programId: p.id }, select: { userId: true, kind: true } }),
        ]);
        const claimedSet = new Set(claimed.map((c) => c.userId));
        const noticedSet = new Set(noticed.map((n) => `${n.userId}:${n.kind}`));

        let sent = 0;
        for (const userId of ids) {
            if (sent >= 500) break; // trần mỗi lần chạy / quỹ
            if (claimedSet.has(userId)) continue;
            const c = checkinDays.get(userId) ?? 0;
            const m = missionDays.get(userId) ?? 0;
            const eligible = c >= p.requiredCheckinDays && m >= p.requiredMissionDays;
            const kind = eligible ? 'ELIGIBLE' : endingSoon ? 'ENDING' : null;
            if (!kind || noticedSet.has(`${userId}:${kind}`)) continue;
            try {
                await this.prisma.sponsorNotice.create({ data: { programId: p.id, userId, kind } });
            } catch {
                continue; // chạy trùng → đã có dòng, bỏ qua
            }
            await this.notify(
                userId,
                eligible ? 'Bạn đã đủ điều kiện nhận thưởng!' : 'Quà tài trợ sắp hết hạn',
                eligible
                    ? `Bạn đã đủ điều kiện nhận quà "${p.title}". Vào Nhiệm vụ để nhận ngay kẻo hết suất.`
                    : `"${p.title}" sắp kết thúc. Bạn mới đạt ${c}/${p.requiredCheckinDays} ngày điểm danh, ${m}/${p.requiredMissionDays} ngày đủ nhiệm vụ.`,
                '/nhiem-vu',
            );
            sent++;
        }
    }

    adminClaims(programId: string) {
        return this.prisma.sponsorClaim.findMany({
            where: { programId },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, username: true, displayName: true, email: true } } },
        });
    }

    async adminFulfill(claimId: string) {
        const r = await this.prisma.sponsorClaim.updateMany({
            where: { id: claimId, status: SponsorClaimStatus.PENDING },
            data: { status: SponsorClaimStatus.FULFILLED, fulfilledAt: new Date() },
        });
        if (r.count === 0) throw new NotFoundException('Không có suất chờ trao');
        return { ok: true };
    }
}
