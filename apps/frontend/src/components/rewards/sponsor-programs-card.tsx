'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Banknote, Gift, Loader2, Package } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { apiErrorMessage } from '@/lib/api/rewards.service';
import { useToast } from '@/components/ui/toast';

export type SponsorRewardType = 'PRODUCT' | 'CASH' | 'STORY_ACCESS';

export interface SponsorProgramView {
    id: string;
    title: string;
    description: string | null;
    sponsorName: string;
    sponsorLogo: string | null;
    rewardType: SponsorRewardType;
    rewardNote: string;
    story: { id: string; title: string; slug: string } | null;
    slots: number;
    claimedCount: number;
    requiredCheckinDays: number;
    requiredMissionDays: number;
    startsAt: string;
    endsAt: string;
    phase: 'off' | 'full' | 'upcoming' | 'running' | 'ended';
    progress: { checkinDays: number; missionDays: number };
    canClaim: boolean;
    claim: { status: 'PENDING' | 'FULFILLED'; createdAt: string } | null;
}

const TYPE_META: Record<SponsorRewardType, { label: string; Icon: typeof Gift }> = {
    PRODUCT: { label: 'Quà hiện vật', Icon: Package },
    CASH: { label: 'Tiền mặt', Icon: Banknote },
    STORY_ACCESS: { label: 'Tặng truyện', Icon: BookOpen },
};

const PHASE_LABEL: Record<SponsorProgramView['phase'], string> = {
    off: 'Đã tắt',
    full: 'Hết suất',
    upcoming: 'Sắp diễn ra',
    running: 'Đang diễn ra',
    ended: 'Đã kết thúc',
};

const fmtDate = (s: string) => new Date(s).toLocaleDateString('vi-VN');

function Bar({ label, value, target }: { label: string; value: number; target: number }) {
    if (target <= 0) return null;
    const pct = Math.min(100, Math.round((value / target) * 100));
    return (
        <div>
            <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                <span>{label}</span>
                <span>{Math.min(value, target)}/{target}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function ProgramItem({ p }: { p: SponsorProgramView }) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [contact, setContact] = useState('');
    const needsContact = p.rewardType !== 'STORY_ACCESS';
    const { label, Icon } = TYPE_META[p.rewardType];

    const claim = useMutation({
        mutationFn: async () => (await apiClient.post(`/sponsors/${p.id}/claim`, { contact: contact.trim() || undefined })).data,
        onSuccess: () => {
            showToast(needsContact ? 'Đã nhận suất! Nhà tài trợ sẽ liên hệ trao thưởng.' : 'Đã nhận thưởng — truyện đã được mở khoá!', 'success');
            qc.invalidateQueries({ queryKey: ['sponsors'] });
        },
        onError: (e) => showToast(apiErrorMessage(e, 'Không nhận được thưởng'), 'error'),
    });

    return (
        <div className="rounded-xl border border-outline-variant/50 bg-surface p-4 space-y-3">
            <div className="flex items-start gap-3">
                {p.sponsorLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.sponsorLogo} alt={p.sponsorName} className="w-10 h-10 rounded-lg object-contain bg-white flex-shrink-0" />
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
                        <Icon size={20} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-on-surface leading-snug">{p.title}</h3>
                    <p className="text-xs text-on-surface-variant">Tài trợ bởi <b>{p.sponsorName}</b></p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant whitespace-nowrap">
                    {PHASE_LABEL[p.phase]}
                </span>
            </div>

            <div className="text-sm text-on-surface">
                <span className="inline-flex items-center gap-1 text-primary font-medium"><Icon size={14} /> {label}:</span>{' '}
                {p.rewardNote}
                {p.story && (
                    <> — <Link href={`/truyen/${p.story.slug}`} className="text-primary hover:underline">{p.story.title}</Link></>
                )}
            </div>
            {p.description && <p className="text-xs text-on-surface-variant whitespace-pre-line">{p.description}</p>}

            <div className="space-y-2">
                <Bar label="Ngày điểm danh" value={p.progress.checkinDays} target={p.requiredCheckinDays} />
                <Bar label="Ngày làm đủ nhiệm vụ" value={p.progress.missionDays} target={p.requiredMissionDays} />
            </div>

            <p className="text-xs text-on-surface-variant">
                {fmtDate(p.startsAt)} – {fmtDate(p.endsAt)} · Còn {Math.max(0, p.slots - p.claimedCount)}/{p.slots} suất
            </p>

            {p.claim ? (
                <p className="text-sm font-medium text-primary">
                    {p.claim.status === 'FULFILLED' ? '✓ Bạn đã nhận thưởng' : '✓ Đã giữ suất — chờ nhà tài trợ trao thưởng'}
                </p>
            ) : p.canClaim ? (
                <div className="space-y-2">
                    {needsContact && (
                        <p className="text-xs text-on-surface-variant">
                            Thông tin bạn nhập sẽ được gửi cho nhà tài trợ để họ liên hệ trao thưởng.
                        </p>
                    )}
                    {needsContact && (
                        <input
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            maxLength={500}
                            placeholder="Địa chỉ / số điện thoại / tài khoản nhận thưởng"
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface"
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => claim.mutate()}
                        disabled={claim.isPending || (needsContact && contact.trim().length < 6)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-50"
                    >
                        {claim.isPending && <Loader2 size={14} className="animate-spin" />}
                        Nhận thưởng
                    </button>
                </div>
            ) : null}
        </div>
    );
}

/** Quỹ thưởng tài trợ — hiện ở trang Nhiệm vụ; ẩn hẳn khi không có chương trình nào. */
export function SponsorProgramsCard() {
    const { data: programs = [] } = useQuery({
        queryKey: ['sponsors'],
        queryFn: async () => ((await apiClient.get<SponsorProgramView[]>('/sponsors')).data as unknown as SponsorProgramView[]) ?? [],
        staleTime: 30 * 1000,
    });
    const list = Array.isArray(programs) ? programs : [];
    return (
        <section className="bg-surface-container rounded-2xl p-5 border border-outline-variant/50">
            <h2 className="font-display text-lg font-bold text-on-surface mb-1 flex items-center gap-2">
                <Gift size={18} className="text-primary" /> Quà từ nhà tài trợ
            </h2>
            <p className="text-sm text-on-surface-variant mb-3">
                Điểm danh và làm đủ nhiệm vụ để nhận quà thật. Tài khoản cần tồn tại ít nhất 3 ngày.
            </p>
            <div className="space-y-3">
                {list.length === 0 && <p className="text-sm text-on-surface-variant">Hiện chưa có chương trình nào.</p>}
                {list.map((p) => <ProgramItem key={p.id} p={p} />)}
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
                Bạn là nhãn hàng, tác giả hay muốn tặng quà cho bạn đọc?{' '}
                <Link href="/tai-tro" className="text-primary font-semibold hover:underline">Trở thành nhà tài trợ</Link>
            </p>
        </section>
    );
}
