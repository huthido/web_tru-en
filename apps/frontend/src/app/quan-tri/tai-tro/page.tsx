'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { apiErrorMessage } from '@/lib/api/rewards.service';
import { useToast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';
import type { SponsorRewardType } from '@/components/rewards/sponsor-programs-card';

interface Program {
    id: string;
    title: string;
    description: string | null;
    sponsorName: string;
    sponsorLogo: string | null;
    rewardType: SponsorRewardType;
    rewardNote: string;
    storyId: string | null;
    slots: number;
    claimedCount: number;
    requiredCheckinDays: number;
    requiredMissionDays: number;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectReason: string | null;
    contactInfo: string | null;
    submittedBy: { username: string; displayName: string | null; email: string | null } | null;
    story: { id: string; title: string } | null;
}

interface Claim {
    id: string;
    contact: string | null;
    status: 'PENDING' | 'FULFILLED';
    createdAt: string;
    user: { username: string; displayName: string | null; email: string | null };
}

const TYPE_LABEL: Record<SponsorRewardType, string> = {
    PRODUCT: 'Hiện vật / voucher',
    CASH: 'Tiền mặt',
    STORY_ACCESS: 'Tặng truyện',
};
const APPROVAL_LABEL = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' } as const;

const KEY = ['admin', 'sponsors'];
const inputCls = 'w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface';
const fmt = (s: string) => new Date(s).toLocaleDateString('vi-VN');
/** ISO → 'YYYY-MM-DD' theo giờ Việt Nam (khớp cách form đổi ngược lại). */
const vnDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

const EMPTY_FORM = {
    title: '', sponsorName: '', sponsorLogo: '', description: '',
    rewardType: 'PRODUCT' as SponsorRewardType, rewardNote: '', storyId: '',
    slots: '10', requiredCheckinDays: '7', requiredMissionDays: '5', startsOn: '', endsOn: '',
};

function ClaimsPanel({ program }: { program: Program }) {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const claimsKey = [...KEY, program.id, 'claims'];
    const { data: claims = [], isLoading } = useQuery({
        queryKey: claimsKey,
        queryFn: async () => ((await apiClient.get<Claim[]>(`/sponsors/admin/programs/${program.id}/claims`)).data as unknown as Claim[]) ?? [],
    });
    const fulfill = useMutation({
        mutationFn: async (id: string) => apiClient.patch(`/sponsors/admin/claims/${id}/fulfill`),
        onSuccess: () => qc.invalidateQueries({ queryKey: claimsKey }),
        onError: (e) => showToast(apiErrorMessage(e, 'Không cập nhật được'), 'error'),
    });
    if (isLoading) return <p className="text-sm text-on-surface-variant py-2">Đang tải…</p>;
    if (claims.length === 0) return <p className="text-sm text-on-surface-variant py-2">Chưa có ai nhận.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-on-surface-variant text-xs">
                        <th className="py-1 pr-3">Người nhận</th><th className="pr-3">Liên hệ nhận thưởng</th><th className="pr-3">Ngày</th><th />
                    </tr>
                </thead>
                <tbody>
                    {claims.map((c) => (
                        <tr key={c.id} className="border-t border-outline-variant/30 align-top">
                            <td className="py-2 pr-3">{c.user.displayName || c.user.username}<div className="text-xs text-on-surface-variant">{c.user.email}</div></td>
                            <td className="pr-3 whitespace-pre-line break-words max-w-xs">{c.contact || '—'}</td>
                            <td className="pr-3 whitespace-nowrap">{fmt(c.createdAt)}</td>
                            <td>
                                {c.status === 'FULFILLED' ? (
                                    <span className="text-xs text-primary">Đã trao</span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fulfill.mutate(c.id)}
                                        disabled={fulfill.isPending}
                                        className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold disabled:opacity-50"
                                    >
                                        Đánh dấu đã trao
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminSponsorsPage() {
    const { showToast } = useToast();
    const qc = useQueryClient();
    const [openId, setOpenId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [f, setF] = useState(EMPTY_FORM);

    const { data: programs = [], isLoading } = useQuery({
        queryKey: KEY,
        queryFn: async () => ((await apiClient.get<Program[]>('/sponsors/admin/programs')).data as unknown as Program[]) ?? [],
    });

    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setF((p) => ({ ...p, [k]: e.target.value }));

    const startEdit = (p: Program) => {
        setEditingId(p.id);
        setF({
            title: p.title, sponsorName: p.sponsorName, sponsorLogo: p.sponsorLogo ?? '', description: p.description ?? '',
            rewardType: p.rewardType, rewardNote: p.rewardNote, storyId: p.storyId ?? '',
            slots: String(p.slots), requiredCheckinDays: String(p.requiredCheckinDays),
            requiredMissionDays: String(p.requiredMissionDays), startsOn: vnDate(p.startsAt), endsOn: vnDate(p.endsAt),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const cancelEdit = () => {
        setEditingId(null);
        setF(EMPTY_FORM);
    };

    const save = useMutation({
        mutationFn: async () => {
            const body = {
                title: f.title,
                sponsorName: f.sponsorName,
                sponsorLogo: f.sponsorLogo || null,
                description: f.description || null,
                rewardType: f.rewardType,
                rewardNote: f.rewardNote,
                storyId: f.rewardType === 'STORY_ACCESS' ? f.storyId.trim() : null,
                slots: Number(f.slots),
                requiredCheckinDays: Number(f.requiredCheckinDays),
                requiredMissionDays: Number(f.requiredMissionDays),
                // Mốc theo giờ Việt Nam: bắt đầu 00:00 ngày đầu, kết thúc 23:59:59 ngày cuối.
                startsAt: new Date(`${f.startsOn}T00:00:00+07:00`).toISOString(),
                endsAt: new Date(`${f.endsOn}T23:59:59+07:00`).toISOString(),
            };
            return editingId
                ? apiClient.put(`/sponsors/admin/programs/${editingId}`, body)
                : apiClient.post('/sponsors/admin/programs', body);
        },
        onSuccess: () => {
            showToast(editingId ? 'Đã lưu chương trình' : 'Đã tạo chương trình', 'success');
            cancelEdit();
            qc.invalidateQueries({ queryKey: KEY });
        },
        onError: (e) => showToast(apiErrorMessage(e, 'Không lưu được chương trình'), 'error'),
    });

    const refresh = () => qc.invalidateQueries({ queryKey: KEY });
    const onError = (e: unknown) => showToast(apiErrorMessage(e, 'Không cập nhật được'), 'error');

    const toggle = useMutation({
        mutationFn: async (p: Program) => apiClient.patch(`/sponsors/admin/programs/${p.id}/active`, { isActive: !p.isActive }),
        onSuccess: refresh,
        onError,
    });
    const approve = useMutation({
        mutationFn: async (id: string) => apiClient.patch(`/sponsors/admin/programs/${id}/approve`),
        onSuccess: () => { showToast('Đã duyệt', 'success'); refresh(); },
        onError,
    });
    const reject = useMutation({
        mutationFn: async (id: string) => apiClient.patch(`/sponsors/admin/programs/${id}/reject`, { reason: rejectReason }),
        onSuccess: () => { showToast('Đã từ chối', 'success'); setRejectingId(null); setRejectReason(''); refresh(); },
        onError,
    });

    const canSubmit = f.title.trim().length >= 3 && f.sponsorName.trim().length >= 2 && f.rewardNote.trim().length >= 2
        && f.startsOn && f.endsOn && Number(f.slots) >= 1 && (f.rewardType !== 'STORY_ACCESS' || f.storyId.trim());

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="font-display text-2xl font-bold text-on-surface">Quỹ thưởng tài trợ</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                    Người dùng điểm danh + làm đủ nhiệm vụ trong thời gian chương trình sẽ nhận 1 suất. Hiện vật / tiền mặt do nhà tài trợ tự trao —
                    nền tảng chỉ ghi nhận danh sách. Thưởng tặng truyện tự mở khoá ngay. Đề xuất do người dùng gửi cần duyệt ở danh sách bên dưới.
                </p>
            </div>

            <section className="bg-surface-container rounded-2xl p-5 border border-outline-variant/50 space-y-3">
                <h2 className="font-semibold text-on-surface">{editingId ? 'Sửa chương trình' : 'Tạo chương trình'}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                    <input className={inputCls} placeholder="Tiêu đề chương trình" value={f.title} onChange={set('title')} maxLength={150} />
                    <input className={inputCls} placeholder="Tên nhà tài trợ" value={f.sponsorName} onChange={set('sponsorName')} maxLength={100} />
                    <input className={inputCls} placeholder="URL logo (tuỳ chọn)" value={f.sponsorLogo} onChange={set('sponsorLogo')} />
                    <select className={inputCls} value={f.rewardType} onChange={set('rewardType')}>
                        {(Object.keys(TYPE_LABEL) as SponsorRewardType[]).map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
                    </select>
                    <input className={inputCls} placeholder="Mô tả phần thưởng (vd: Voucher 100.000đ)" value={f.rewardNote} onChange={set('rewardNote')} maxLength={300} />
                    {f.rewardType === 'STORY_ACCESS' && (
                        <input className={inputCls} placeholder="ID hoặc slug truyện được tặng" value={f.storyId} onChange={set('storyId')} />
                    )}
                    <label className="text-xs text-on-surface-variant">Số suất
                        <input type="number" min={1} className={inputCls} value={f.slots} onChange={set('slots')} />
                    </label>
                    <label className="text-xs text-on-surface-variant">Số ngày điểm danh tối thiểu
                        <input type="number" min={0} className={inputCls} value={f.requiredCheckinDays} onChange={set('requiredCheckinDays')} />
                    </label>
                    <label className="text-xs text-on-surface-variant">Số ngày làm đủ nhiệm vụ tối thiểu
                        <input type="number" min={0} className={inputCls} value={f.requiredMissionDays} onChange={set('requiredMissionDays')} />
                    </label>
                    <span />
                    <label className="text-xs text-on-surface-variant">Bắt đầu (giờ VN)
                        <input type="date" className={inputCls} value={f.startsOn} onChange={set('startsOn')} />
                    </label>
                    <label className="text-xs text-on-surface-variant">Kết thúc (hết ngày)
                        <input type="date" className={inputCls} value={f.endsOn} onChange={set('endsOn')} />
                    </label>
                </div>
                <textarea className={inputCls} rows={3} placeholder="Mô tả / thể lệ (tuỳ chọn)" value={f.description} onChange={set('description')} maxLength={2000} />
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => save.mutate()}
                        disabled={!canSubmit || save.isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-50"
                    >
                        {save.isPending && <Loader2 size={14} className="animate-spin" />}
                        {editingId ? 'Lưu thay đổi' : 'Tạo chương trình'}
                    </button>
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-xl border border-outline-variant text-sm text-on-surface">
                            Huỷ sửa
                        </button>
                    )}
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="font-semibold text-on-surface">Danh sách chương trình</h2>
                {isLoading ? <Loading /> : programs.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">Chưa có chương trình nào.</p>
                ) : programs.map((p) => (
                    <div key={p.id} className="bg-surface-container rounded-2xl p-4 border border-outline-variant/50 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="font-semibold text-on-surface flex items-center gap-2 flex-wrap">
                                    {p.title}
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-surface-container-high text-on-surface-variant'}`}>
                                        {APPROVAL_LABEL[p.approvalStatus]}
                                    </span>
                                </div>
                                <div className="text-xs text-on-surface-variant">
                                    {p.sponsorName} · {TYPE_LABEL[p.rewardType]}: {p.rewardNote}{p.story ? ` (${p.story.title})` : ''}
                                </div>
                                <div className="text-xs text-on-surface-variant">
                                    {fmt(p.startsAt)} – {fmt(p.endsAt)} · {p.claimedCount}/{p.slots} suất · cần {p.requiredCheckinDays} ngày điểm danh, {p.requiredMissionDays} ngày đủ nhiệm vụ
                                </div>
                                {p.submittedBy && (
                                    <div className="text-xs text-on-surface-variant mt-1">
                                        Gửi bởi <b>{p.submittedBy.displayName || p.submittedBy.username}</b> ({p.submittedBy.email}) · Liên hệ: {p.contactInfo || '—'}
                                    </div>
                                )}
                                {p.approvalStatus === 'REJECTED' && p.rejectReason && (
                                    <div className="text-xs text-error mt-1">Lý do từ chối: {p.rejectReason}</div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {p.approvalStatus !== 'APPROVED' && (
                                    <button type="button" onClick={() => approve.mutate(p.id)} disabled={approve.isPending}
                                        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold disabled:opacity-50">
                                        Duyệt
                                    </button>
                                )}
                                {p.approvalStatus === 'PENDING' && (
                                    <button type="button" onClick={() => { setRejectingId(rejectingId === p.id ? null : p.id); setRejectReason(''); }}
                                        className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface">
                                        Từ chối
                                    </button>
                                )}
                                <button type="button" onClick={() => startEdit(p)}
                                    className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface">Sửa</button>
                                <button type="button" onClick={() => setOpenId(openId === p.id ? null : p.id)}
                                    className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface">
                                    {openId === p.id ? 'Ẩn người nhận' : 'Người nhận'}
                                </button>
                                {p.approvalStatus === 'APPROVED' && (
                                    <button type="button" onClick={() => toggle.mutate(p)} disabled={toggle.isPending}
                                        className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface disabled:opacity-50">
                                        {p.isActive ? 'Tắt' : 'Bật'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {rejectingId === p.id && (
                            <div className="flex gap-2">
                                <input className={inputCls} placeholder="Lý do từ chối (gửi cho người đề xuất)" value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)} maxLength={300} />
                                <button type="button" onClick={() => reject.mutate(p.id)} disabled={reject.isPending}
                                    className="px-4 py-2 rounded-lg bg-error text-on-error text-xs font-semibold whitespace-nowrap disabled:opacity-50">
                                    Xác nhận
                                </button>
                            </div>
                        )}
                        {openId === p.id && <ClaimsPanel program={p} />}
                    </div>
                ))}
            </section>
        </div>
    );
}
