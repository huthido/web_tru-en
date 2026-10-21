'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { apiErrorMessage } from '@/lib/api/rewards.service';
import { useToast } from '@/components/ui/toast';
import type { SponsorRewardType } from '@/components/rewards/sponsor-programs-card';

interface MyProgram {
    id: string;
    title: string;
    rewardType: SponsorRewardType;
    rewardNote: string;
    slots: number;
    claimedCount: number;
    startsAt: string;
    endsAt: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectReason: string | null;
}

interface MyClaim {
    id: string;
    contact: string | null;
    status: 'PENDING' | 'FULFILLED';
    createdAt: string;
    user: { username: string; displayName: string | null };
}

const TYPE_LABEL: Record<SponsorRewardType, string> = {
    PRODUCT: 'Hiện vật / voucher',
    CASH: 'Tiền mặt',
    STORY_ACCESS: 'Tặng truyện của tôi',
};
const APPROVAL_LABEL = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' } as const;
const inputCls = 'w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface';
const fmt = (s: string) => new Date(s).toLocaleDateString('vi-VN');
const KEY = ['sponsors', 'mine'];

function MyClaims({ programId }: { programId: string }) {
    const qc = useQueryClient();
    const { showToast } = useToast();
    const key = [...KEY, programId, 'claims'];
    const { data: claims = [], isLoading } = useQuery({
        queryKey: key,
        queryFn: async () => ((await apiClient.get<MyClaim[]>(`/sponsors/mine/${programId}/claims`)).data as unknown as MyClaim[]) ?? [],
    });
    const fulfill = useMutation({
        mutationFn: async (id: string) => apiClient.patch(`/sponsors/mine/claims/${id}/fulfill`),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
        onError: (e) => showToast(apiErrorMessage(e, 'Không cập nhật được'), 'error'),
    });
    if (isLoading) return <p className="text-sm text-on-surface-variant">Đang tải…</p>;
    if (claims.length === 0) return <p className="text-sm text-on-surface-variant">Chưa có ai nhận thưởng.</p>;
    return (
        <ul className="divide-y divide-outline-variant/30">
            {claims.map((c) => (
                <li key={c.id} className="py-2 flex flex-wrap items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                        <div className="font-medium text-on-surface">{c.user.displayName || c.user.username}</div>
                        <div className="text-on-surface-variant whitespace-pre-line break-words">{c.contact || 'Không cần thông tin nhận (tặng truyện)'}</div>
                    </div>
                    {c.status === 'FULFILLED' ? (
                        <span className="text-xs text-primary">Đã trao</span>
                    ) : (
                        <button type="button" onClick={() => fulfill.mutate(c.id)} disabled={fulfill.isPending}
                            className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold disabled:opacity-50">
                            Đánh dấu đã trao
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}

export default function SponsorPage() {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [openId, setOpenId] = useState<string | null>(null);

    const { data: mine = [] } = useQuery({
        queryKey: KEY,
        enabled: isAuthenticated,
        queryFn: async () => ((await apiClient.get<MyProgram[]>('/sponsors/mine')).data as unknown as MyProgram[]) ?? [],
    });

    const [f, setF] = useState({
        title: '', sponsorName: '', description: '', rewardType: 'PRODUCT' as SponsorRewardType,
        rewardNote: '', storyId: '', slots: '10', requiredCheckinDays: '7', requiredMissionDays: '5',
        startsOn: '', endsOn: '', contactInfo: '',
    });
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setF((p) => ({ ...p, [k]: e.target.value }));

    const propose = useMutation({
        mutationFn: async () => apiClient.post('/sponsors/propose', {
            title: f.title, sponsorName: f.sponsorName, description: f.description || null,
            rewardType: f.rewardType, rewardNote: f.rewardNote,
            storyId: f.rewardType === 'STORY_ACCESS' ? f.storyId.trim() : null,
            slots: Number(f.slots),
            requiredCheckinDays: Number(f.requiredCheckinDays),
            requiredMissionDays: Number(f.requiredMissionDays),
            startsAt: new Date(`${f.startsOn}T00:00:00+07:00`).toISOString(),
            endsAt: new Date(`${f.endsOn}T23:59:59+07:00`).toISOString(),
            contactInfo: f.contactInfo,
        }),
        onSuccess: () => {
            showToast('Đã gửi đề xuất — admin sẽ duyệt sớm', 'success');
            qc.invalidateQueries({ queryKey: KEY });
        },
        onError: (e) => showToast(apiErrorMessage(e, 'Không gửi được đề xuất'), 'error'),
    });

    const canSubmit = f.title.trim().length >= 3 && f.sponsorName.trim().length >= 2 && f.rewardNote.trim().length >= 2
        && f.contactInfo.trim().length >= 5 && f.startsOn && f.endsOn && Number(f.slots) >= 1
        && (f.rewardType !== 'STORY_ACCESS' || f.storyId.trim());

    return (
        <div className="min-h-screen bg-surface">
            <Sidebar />
            <div className="md:ml-60">
                <Header />
                <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-24">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-on-surface">Trở thành nhà tài trợ</h1>
                        <p className="text-sm text-on-surface-variant mt-1">
                            Góp quà (hiện vật, tiền mặt hoặc truyện của bạn) cho những bạn đọc chăm điểm danh và làm nhiệm vụ.
                            Đề xuất được admin duyệt trước khi hiển thị. Bạn tự trao quà cho người nhận; nền tảng chỉ cung cấp danh sách.
                        </p>
                    </div>

                    {!isAuthenticated ? (
                        <p className="text-sm">
                            <Link href="/dang-nhap?redirect=/tai-tro" className="text-primary font-semibold hover:underline">Đăng nhập</Link> để gửi đề xuất tài trợ.
                        </p>
                    ) : (
                        <>
                            <section className="bg-surface-container rounded-2xl p-5 border border-outline-variant/50 space-y-3">
                                <h2 className="font-semibold text-on-surface">Gửi đề xuất mới</h2>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <input className={inputCls} placeholder="Tiêu đề chương trình" value={f.title} onChange={set('title')} maxLength={150} />
                                    <input className={inputCls} placeholder="Tên hiển thị của nhà tài trợ" value={f.sponsorName} onChange={set('sponsorName')} maxLength={100} />
                                    <select className={inputCls} value={f.rewardType} onChange={set('rewardType')}>
                                        {(Object.keys(TYPE_LABEL) as SponsorRewardType[]).map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
                                    </select>
                                    <input className={inputCls} placeholder="Phần thưởng (vd: Voucher 100.000đ)" value={f.rewardNote} onChange={set('rewardNote')} maxLength={300} />
                                    {f.rewardType === 'STORY_ACCESS' && (
                                        <input className={inputCls} placeholder="ID hoặc slug truyện của bạn" value={f.storyId} onChange={set('storyId')} />
                                    )}
                                    <label className="text-xs text-on-surface-variant">Số suất
                                        <input type="number" min={1} className={inputCls} value={f.slots} onChange={set('slots')} />
                                    </label>
                                    <label className="text-xs text-on-surface-variant">Ngày điểm danh tối thiểu
                                        <input type="number" min={0} className={inputCls} value={f.requiredCheckinDays} onChange={set('requiredCheckinDays')} />
                                    </label>
                                    <label className="text-xs text-on-surface-variant">Ngày làm đủ nhiệm vụ tối thiểu
                                        <input type="number" min={0} className={inputCls} value={f.requiredMissionDays} onChange={set('requiredMissionDays')} />
                                    </label>
                                    <label className="text-xs text-on-surface-variant">Bắt đầu
                                        <input type="date" className={inputCls} value={f.startsOn} onChange={set('startsOn')} />
                                    </label>
                                    <label className="text-xs text-on-surface-variant">Kết thúc (hết ngày)
                                        <input type="date" className={inputCls} value={f.endsOn} onChange={set('endsOn')} />
                                    </label>
                                </div>
                                <input className={inputCls} placeholder="Cách liên hệ bạn (SĐT / Zalo / email) — chỉ admin thấy" value={f.contactInfo} onChange={set('contactInfo')} maxLength={300} />
                                <textarea className={inputCls} rows={3} placeholder="Thể lệ / mô tả (tuỳ chọn)" value={f.description} onChange={set('description')} maxLength={2000} />
                                <button type="button" onClick={() => propose.mutate()} disabled={!canSubmit || propose.isPending}
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-50">
                                    {propose.isPending && <Loader2 size={14} className="animate-spin" />}
                                    Gửi đề xuất
                                </button>
                            </section>

                            {mine.length > 0 && (
                                <section className="space-y-3">
                                    <h2 className="font-semibold text-on-surface">Đề xuất của tôi</h2>
                                    {mine.map((p) => (
                                        <div key={p.id} className="bg-surface-container rounded-2xl p-4 border border-outline-variant/50 space-y-2">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <div className="font-semibold text-on-surface">{p.title}</div>
                                                    <div className="text-xs text-on-surface-variant">
                                                        {TYPE_LABEL[p.rewardType]}: {p.rewardNote} · {fmt(p.startsAt)} – {fmt(p.endsAt)} · {p.claimedCount}/{p.slots} suất
                                                    </div>
                                                    {p.approvalStatus === 'REJECTED' && p.rejectReason && (
                                                        <div className="text-xs text-error mt-1">Lý do: {p.rejectReason}</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                                                        {APPROVAL_LABEL[p.approvalStatus]}
                                                    </span>
                                                    {p.approvalStatus === 'APPROVED' && (
                                                        <button type="button" onClick={() => setOpenId(openId === p.id ? null : p.id)}
                                                            className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface">
                                                            {openId === p.id ? 'Ẩn người nhận' : 'Người nhận'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {openId === p.id && <MyClaims programId={p.id} />}
                                        </div>
                                    ))}
                                </section>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
