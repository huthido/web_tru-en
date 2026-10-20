'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    BookOpen, CalendarCheck, Check, Copy, Gift, Headphones, Loader2, MessageCircle, Share2, Sparkles, Ticket, UserPlus,
} from 'lucide-react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { useAuth } from '@/lib/api/hooks/use-auth';
import {
    useCheckIn, useClaimMission, useRedeemGiftCode, useReferralCode, useRewardsStatus,
} from '@/lib/api/hooks/use-rewards';
import { apiErrorMessage, type MissionKey, type RewardsStatus } from '@/lib/api/rewards.service';
import { useToast } from '@/components/ui/toast';
import { WebPushToggle, useWebPushConfig } from '@/components/notifications/web-push-toggle';

const MISSION_ICON: Record<MissionKey, typeof BookOpen> = {
    read: BookOpen,
    listen: Headphones,
    comment: MessageCircle,
};
const MISSION_CTA: Record<MissionKey, { href: string; label: string }> = {
    read: { href: '/truyen', label: 'Đi đọc' },
    listen: { href: '/truyen', label: 'Đi nghe' },
    comment: { href: '/truyen', label: 'Đi bình luận' },
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <section className={`bg-surface-container rounded-2xl p-5 border border-outline-variant/50 ${className}`}>{children}</section>;
}

function CheckInCard({ status }: { status: RewardsStatus }) {
    const { showToast } = useToast();
    const checkIn = useCheckIn();
    const { checkedInToday, streak, schedule, nextReward } = status.checkIn;
    const L = Math.max(1, schedule.length);
    // Số ô đã điểm danh trong vòng hiện tại (chuỗi dài hơn lịch thì lặp lại).
    const doneInCycle = checkedInToday ? ((streak - 1) % L) + 1 : streak % L;

    const onCheckIn = () =>
        checkIn.mutate(undefined, {
            onSuccess: (r) => showToast(`Điểm danh ngày ${r.streak}: +${r.reward} xu thưởng`, 'success'),
            onError: (e) => showToast(apiErrorMessage(e, 'Không điểm danh được'), 'error'),
        });

    return (
        <Card>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h2 className="font-display text-lg font-bold text-on-surface flex items-center gap-2">
                        <CalendarCheck size={20} className="text-primary" /> Điểm danh hằng ngày
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                        {streak > 0 ? `Chuỗi hiện tại: ${streak} ngày liên tiếp` : 'Điểm danh mỗi ngày để nhận xu thưởng tăng dần'}
                    </p>
                </div>
            </div>
            {schedule.length > 0 && (
                <div className="grid grid-cols-7 gap-1.5 mb-4">
                    {schedule.map((reward, i) => {
                        const done = i < doneInCycle;
                        const isNext = i === doneInCycle && !checkedInToday;
                        return (
                            <div
                                key={i}
                                className={`rounded-xl py-2 text-center border ${done
                                    ? 'bg-primary text-on-primary border-transparent'
                                    : isNext
                                        ? 'bg-primary-container text-on-primary-container border-primary'
                                        : 'bg-surface-container-high text-on-surface-variant border-outline-variant/40'
                                    }`}
                            >
                                <div className="text-[10px] font-semibold opacity-80">N{i + 1}</div>
                                <div className="text-sm font-bold">{done ? <Check size={16} className="mx-auto" /> : `+${reward}`}</div>
                            </div>
                        );
                    })}
                </div>
            )}
            <button
                type="button"
                onClick={onCheckIn}
                disabled={checkedInToday || checkIn.isPending || !status.enabled}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-on-primary disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
                {checkIn.isPending && <Loader2 size={16} className="animate-spin" />}
                {checkedInToday
                    ? `Đã điểm danh hôm nay${status.checkIn.todayReward ? ` (+${status.checkIn.todayReward} xu)` : ''} — mai nhận +${nextReward}`
                    : `Điểm danh nhận +${nextReward} xu thưởng`}
            </button>
        </Card>
    );
}

function MissionsCard({ status }: { status: RewardsStatus }) {
    const { showToast } = useToast();
    const claim = useClaimMission();
    if (status.missions.length === 0) return null;
    return (
        <Card>
            <h2 className="font-display text-lg font-bold text-on-surface mb-1">Nhiệm vụ hôm nay</h2>
            <p className="text-sm text-on-surface-variant mb-4">Làm mới lúc 0 giờ mỗi ngày.</p>
            <ul className="space-y-3">
                {status.missions.map((m) => {
                    const Icon = MISSION_ICON[m.key];
                    const done = m.progress >= m.target;
                    const pct = Math.round((m.progress / m.target) * 100);
                    const pending = claim.isPending && claim.variables === m.key;
                    return (
                        <li key={m.key} className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                                <Icon size={18} className="text-on-primary-container" />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="font-medium text-on-surface truncate">{m.label}</span>
                                    <span className="text-xs text-on-surface-variant flex-shrink-0">{m.progress}/{m.target}</span>
                                </div>
                                <div className="h-1.5 mt-1.5 rounded-full bg-surface-variant overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                            {m.claimed ? (
                                <span className="text-xs font-semibold text-on-surface-variant w-24 text-right">Đã nhận</span>
                            ) : done ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        claim.mutate(m.key, {
                                            onSuccess: (r) => showToast(`+${r.reward} xu thưởng`, 'success'),
                                            onError: (e) => showToast(apiErrorMessage(e, 'Không nhận được thưởng'), 'error'),
                                        })
                                    }
                                    disabled={pending || !status.enabled}
                                    className="w-24 py-2 rounded-full text-xs font-semibold bg-primary text-on-primary disabled:opacity-60"
                                >
                                    {pending ? '…' : `Nhận +${m.reward}`}
                                </button>
                            ) : (
                                <Link
                                    href={MISSION_CTA[m.key].href}
                                    className="w-24 py-2 rounded-full text-xs font-semibold text-center bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                                >
                                    {MISSION_CTA[m.key].label} · +{m.reward}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

function ReferralCard({ status }: { status: RewardsStatus }) {
    const { showToast } = useToast();
    const getCode = useReferralCode();
    const { referral } = status;
    if (!referral.enabled) return null;
    const code = referral.code || getCode.data?.code || null;
    const link = code && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${code}` : '';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            showToast('Đã sao chép link mời', 'success');
        } catch {
            showToast(link, 'info');
        }
    };
    const share = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'YÊU — đọc & nghe truyện', text: 'Vào YÊU đọc truyện cùng mình nhé!', url: link });
                return;
            } catch { /* người dùng huỷ */ }
        }
        copy();
    };

    return (
        <Card>
            <h2 className="font-display text-lg font-bold text-on-surface flex items-center gap-2 mb-1">
                <UserPlus size={20} className="text-primary" /> Mời bạn bè
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
                Bạn nhận <b className="text-on-surface">+{referral.rewardReferrer}</b>, bạn bè nhận{' '}
                <b className="text-on-surface">+{referral.rewardReferee}</b> xu thưởng khi bạn ấy đăng ký qua link của bạn và điểm danh lần đầu.
            </p>
            {code ? (
                <>
                    <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 min-w-0 truncate px-3 py-2.5 rounded-xl bg-surface-container-high text-sm text-on-surface">{link}</code>
                        <button type="button" onClick={copy} aria-label="Sao chép link mời" className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest">
                            <Copy size={18} />
                        </button>
                        <button type="button" onClick={share} aria-label="Chia sẻ link mời" className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                            <Share2 size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                        Mã mời: <b className="text-on-surface tracking-wider">{code}</b> · Đã mời {referral.invitedCount} người · {referral.rewardedCount} lượt đã nhận thưởng
                    </p>
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => getCode.mutate(undefined, { onError: (e) => showToast(apiErrorMessage(e, 'Không tạo được mã'), 'error') })}
                    disabled={getCode.isPending}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-on-primary disabled:opacity-60"
                >
                    {getCode.isPending ? 'Đang tạo…' : 'Lấy link mời của tôi'}
                </button>
            )}
        </Card>
    );
}

function GiftCodeCard({ enabled }: { enabled: boolean }) {
    const { showToast } = useToast();
    const redeem = useRedeemGiftCode();
    const [code, setCode] = useState('');
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        redeem.mutate(code.trim(), {
            onSuccess: (r) => {
                showToast(`Nhận +${r.reward} xu thưởng`, 'success');
                setCode('');
            },
            onError: (err) => showToast(apiErrorMessage(err, 'Mã không hợp lệ'), 'error'),
        });
    };
    return (
        <Card>
            <h2 className="font-display text-lg font-bold text-on-surface flex items-center gap-2 mb-3">
                <Ticket size={20} className="text-primary" /> Nhập giftcode
            </h2>
            <form onSubmit={submit} className="flex gap-2">
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: YEU2026"
                    maxLength={64}
                    autoCapitalize="characters"
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                    type="submit"
                    disabled={!code.trim() || redeem.isPending || !enabled}
                    className="px-5 rounded-xl text-sm font-semibold bg-primary text-on-primary disabled:opacity-60"
                >
                    {redeem.isPending ? '…' : 'Nhận'}
                </button>
            </form>
        </Card>
    );
}

export default function MissionsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { data: status, isLoading } = useRewardsStatus(isAuthenticated);
    const { data: pushConfig } = useWebPushConfig();

    return (
        <div className="min-h-screen bg-surface">
            <Sidebar />
            <div className="md:ml-60 pb-20 md:pb-0">
                <Header />
                <main className="px-4 md:px-6 pt-5 md:pt-8 pb-12 max-w-2xl mx-auto space-y-4">
                    <div className="rounded-2xl p-5 bg-primary-container text-on-primary-container">
                        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">
                            <Gift size={24} /> Nhiệm vụ &amp; quà
                        </h1>
                        {status && (
                            <p className="mt-2 text-sm flex items-center gap-1.5">
                                <Sparkles size={16} /> Xu thưởng hiện có: <b className="text-lg">{status.bonusBalance.toLocaleString('vi-VN')}</b>
                            </p>
                        )}
                        <p className="mt-1 text-xs opacity-80">
                            Xu thưởng dùng để mở khoá chương / truyện VIP (tự trừ trước xu nạp). Không chuyển, ủng hộ hay rút được.
                        </p>
                    </div>

                    {!authLoading && !isAuthenticated ? (
                        <Card className="text-center">
                            <p className="text-on-surface-variant mb-4">Đăng nhập để điểm danh, làm nhiệm vụ và nhận xu thưởng.</p>
                            <Link href="/dang-nhap?redirect=/nhiem-vu" className="inline-block px-6 py-2.5 rounded-xl bg-primary text-on-primary font-semibold">
                                Đăng nhập
                            </Link>
                        </Card>
                    ) : isLoading || !status ? (
                        <div className="space-y-4 animate-pulse">
                            {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-2xl bg-surface-container" />)}
                        </div>
                    ) : (
                        <>
                            {!status.enabled && (
                                <Card><p className="text-sm text-on-surface-variant">Chương trình thưởng đang tạm dừng.</p></Card>
                            )}
                            <CheckInCard status={status} />
                            <MissionsCard status={status} />
                            {pushConfig?.enabled && (
                            <Card>
                                <h2 className="font-display text-lg font-bold text-on-surface mb-1">Không bỏ lỡ chương mới</h2>
                                <p className="text-sm text-on-surface-variant mb-3">
                                    Nhận thông báo khi truyện bạn theo dõi ra chương mới, kể cả lúc đã đóng web.
                                </p>
                                <WebPushToggle />
                            </Card>
                            )}
                            <ReferralCard status={status} />
                            <GiftCodeCard enabled={status.enabled} />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
