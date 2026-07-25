'use client';

import { useMemo, useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast, ToastContainer } from '@/components/ui/toast';
import {
    useAdSlots,
    useCreateAdSlot,
    useUpdateAdSlot,
    useDeleteAdSlot,
} from '@/lib/api/hooks/use-ads';
import {
    AdPosition,
    AdSlot,
    AdType,
    CreateAdSlotRequest,
} from '@/lib/api/ads.service';

const PAGE_KEYS = [
    'home',
    'stories.list',
    'stories.detail',
    'reading',
    'search',
    'profile',
    'library',
] as const;

const POSITION_LABELS: Record<AdPosition, string> = {
    [AdPosition.TOP]: 'TOP',
    [AdPosition.BOTTOM]: 'BOTTOM',
    [AdPosition.INLINE]: 'INLINE',
    [AdPosition.SIDEBAR_LEFT]: 'SIDEBAR_LEFT',
    [AdPosition.SIDEBAR_RIGHT]: 'SIDEBAR_RIGHT',
};

const TYPE_LABELS: Record<AdType, string> = {
    [AdType.BANNER]: 'BANNER',
    [AdType.SIDEBAR]: 'SIDEBAR',
    [AdType.POPUP]: 'POPUP',
};

/**
 * Quản lý AdSlot — registry các vị trí ads trên site. Admin có thể:
 * - Bật/tắt slot (slot tắt → frontend không render dù có ads bind)
 * - Đổi maxAds (số ads stack đồng thời)
 * - Đổi label friendly
 * - Tạo slot mới cho route page mới (cần dev thêm `<AdSlot slotKey="X">` ở page tương ứng)
 *
 * Slot `key` không nên đổi sau khi tạo vì frontend tham chiếu trực tiếp.
 */
export default function AdminAdSlotsPage() {
    const { data: slots = [], isLoading } = useAdSlots();
    const createMutation = useCreateAdSlot();
    const updateMutation = useUpdateAdSlot();
    const deleteMutation = useDeleteAdSlot();
    const { toasts, showToast, removeToast } = useToast();

    const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);
    const [creating, setCreating] = useState(false);
    const [deletingSlot, setDeletingSlot] = useState<AdSlot | null>(null);

    // Group slot theo pageKey để admin dễ scan.
    const slotsByPage = useMemo(() => {
        const map = new Map<string, AdSlot[]>();
        for (const slot of slots) {
            const list = map.get(slot.pageKey) ?? [];
            list.push(slot);
            map.set(slot.pageKey, list);
        }
        return Array.from(map).sort(([a], [b]) => a.localeCompare(b));
    }, [slots]);

    const handleToggleEnabled = async (slot: AdSlot) => {
        try {
            await updateMutation.mutateAsync({
                id: slot.id,
                data: { enabled: !slot.enabled },
            });
            showToast(slot.enabled ? 'Đã tắt slot' : 'Đã bật slot', 'success');
        } catch {
            showToast('Lỗi khi cập nhật slot', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingSlot) return;
        try {
            await deleteMutation.mutateAsync(deletingSlot.id);
            setDeletingSlot(null);
            showToast('Đã xoá slot', 'success');
        } catch {
            showToast('Lỗi khi xoá slot', 'error');
        }
    };

    if (isLoading) return <Loading />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface">Slot quảng cáo</h1>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Registry các vị trí ads trên site. Mỗi slot có 1 key duy nhất —
                        frontend dùng <code className="px-1 bg-surface-container-high rounded">&lt;AdSlot slotKey=&quot;...&quot;/&gt;</code> để render.
                    </p>
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
                >
                    + Tạo slot mới
                </button>
            </div>

            <div className="space-y-4">
                {slotsByPage.map(([pageKey, pageSlots]) => (
                    <div
                        key={pageKey}
                        className="bg-surface-container rounded-lg overflow-hidden border border-outline-variant"
                    >
                        <div className="px-4 py-3 bg-surface-container-high border-b border-outline-variant">
                            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">
                                {pageKey}
                            </h2>
                        </div>
                        <div className="divide-y divide-outline-variant">
                            {pageSlots.map((slot) => (
                                <div
                                    key={slot.id}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low transition-colors"
                                >
                                    <button
                                        onClick={() => handleToggleEnabled(slot)}
                                        className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${slot.enabled ? 'bg-primary' : 'bg-surface-variant'
                                            }`}
                                        title={slot.enabled ? 'Bật' : 'Tắt'}
                                    >
                                        <span
                                            className={`absolute top-0.5 w-5 h-5 bg-surface rounded-full transition-transform ${slot.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                                                }`}
                                        />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-on-surface">{slot.label}</span>
                                            <span className="px-2 py-0.5 text-xs bg-surface-container-high rounded font-mono text-on-surface-variant">
                                                {slot.key}
                                            </span>
                                            <span className="px-2 py-0.5 text-xs bg-tertiary-container text-on-tertiary-container rounded">
                                                {POSITION_LABELS[slot.position]}
                                            </span>
                                            {slot.adType && (
                                                <span className="px-2 py-0.5 text-xs bg-primary-container text-on-primary-container rounded">
                                                    {TYPE_LABELS[slot.adType]}
                                                </span>
                                            )}
                                            {slot.platform && slot.platform !== 'all' && (
                                                <span className="px-2 py-0.5 text-xs bg-surface-container-high rounded">
                                                    {slot.platform}
                                                </span>
                                            )}
                                            <span className="text-xs text-on-surface-variant">
                                                max {slot.maxAds}
                                            </span>
                                            {slot._count?.bindings !== undefined && (
                                                <span className="text-xs text-on-surface-variant">
                                                    · {slot._count.bindings} ads
                                                </span>
                                            )}
                                            {slot.isPublicForBooking && (
                                                <span className="px-2 py-0.5 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded">
                                                    Mở bán · {(slot.pricePerDay ?? 0).toLocaleString('vi-VN')} đ/ngày
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setEditingSlot(slot)}
                                        className="px-3 py-1.5 text-sm border border-outline-variant rounded hover:bg-surface-container-high transition-colors"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => setDeletingSlot(slot)}
                                        className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Xoá
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {slotsByPage.length === 0 && (
                    <div className="text-center py-12 text-on-surface-variant">
                        Chưa có slot nào.
                    </div>
                )}
            </div>

            {(creating || editingSlot) && (
                <SlotFormModal
                    slot={editingSlot}
                    onClose={() => {
                        setCreating(false);
                        setEditingSlot(null);
                    }}
                    onSubmit={async (data) => {
                        try {
                            if (editingSlot) {
                                await updateMutation.mutateAsync({ id: editingSlot.id, data });
                                showToast('Đã cập nhật slot', 'success');
                            } else {
                                await createMutation.mutateAsync(data);
                                showToast('Đã tạo slot', 'success');
                            }
                            setCreating(false);
                            setEditingSlot(null);
                        } catch (err: any) {
                            showToast(err?.response?.data?.message ?? 'Lỗi khi lưu slot', 'error');
                        }
                    }}
                />
            )}

            {deletingSlot && (
                <ConfirmModal
                    isOpen={!!deletingSlot}
                    onClose={() => setDeletingSlot(null)}
                    onConfirm={handleDelete}
                    title="Xoá slot"
                    message={`Xoá slot "${deletingSlot.label}"? Tất cả binding ads sẽ bị xoá theo.`}
                    confirmText="Xoá"
                    cancelText="Huỷ"
                    confirmColor="red"
                    isLoading={deleteMutation.isPending}
                />
            )}

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}

function SlotFormModal({
    slot,
    onClose,
    onSubmit,
}: {
    slot: AdSlot | null;
    onClose: () => void;
    onSubmit: (data: CreateAdSlotRequest) => Promise<void>;
}) {
    const [formData, setFormData] = useState<CreateAdSlotRequest>({
        key: slot?.key ?? '',
        pageKey: slot?.pageKey ?? PAGE_KEYS[0],
        position: slot?.position ?? AdPosition.TOP,
        label: slot?.label ?? '',
        maxAds: slot?.maxAds ?? 1,
        enabled: slot?.enabled ?? true,
        adType: slot?.adType ?? undefined,
        platform: slot?.platform ?? undefined,
        pricePerDay: slot?.pricePerDay ?? 0,
        isPublicForBooking: slot?.isPublicForBooking ?? false,
        bookingNote: slot?.bookingNote ?? '',
    });
    const [submitting, setSubmitting] = useState(false);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-on-surface">
                            {slot ? 'Sửa slot' : 'Tạo slot mới'}
                        </h2>
                        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmitting(true);
                            try {
                                await onSubmit(formData);
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Key <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                placeholder="home.top, reading.inline, ..."
                                disabled={!!slot}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant font-mono text-sm disabled:opacity-60"
                            />
                            <p className="mt-1 text-xs text-on-surface-variant">
                                Format <code>pageKey.suffix</code>. Frontend tham chiếu trực tiếp — không nên đổi sau khi tạo.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Label <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="Banner đầu trang chủ"
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Page key
                                </label>
                                <select
                                    value={formData.pageKey}
                                    onChange={(e) => setFormData({ ...formData, pageKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                >
                                    {PAGE_KEYS.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Position
                                </label>
                                <select
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value as AdPosition })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                >
                                    {Object.values(AdPosition).map((p) => (
                                        <option key={p} value={p}>{POSITION_LABELS[p]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Max ads
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.maxAds ?? 1}
                                    onChange={(e) => setFormData({ ...formData, maxAds: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Ad type
                                </label>
                                <select
                                    value={formData.adType ?? ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        adType: e.target.value ? (e.target.value as AdType) : undefined,
                                    })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                >
                                    <option value="">Mọi type</option>
                                    {Object.values(AdType).map((t) => (
                                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Platform
                                </label>
                                <select
                                    value={formData.platform ?? 'all'}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        platform: e.target.value as 'web' | 'mobile' | 'all',
                                    })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                >
                                    <option value="all">all</option>
                                    <option value="web">web</option>
                                    <option value="mobile">mobile</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="slotEnabled"
                                checked={formData.enabled ?? true}
                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                            />
                            <label htmlFor="slotEnabled" className="text-sm font-medium text-on-surface-variant">
                                Bật slot
                            </label>
                        </div>

                        {/* Mở bán self-service trên /quang-cao */}
                        <div className="border-t border-outline-variant pt-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="slotBookable"
                                    checked={formData.isPublicForBooking ?? false}
                                    onChange={(e) => setFormData({ ...formData, isPublicForBooking: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                                <label htmlFor="slotBookable" className="text-sm font-medium text-on-surface-variant">
                                    Mở bán trên trang /quang-cao (cần giá &gt; 0)
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Giá thuê (VND/ngày)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={formData.pricePerDay ?? 0}
                                    onChange={(e) => setFormData({ ...formData, pricePerDay: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Ghi chú public (kích thước banner đề xuất…)
                                </label>
                                <input
                                    type="text"
                                    value={formData.bookingNote ?? ''}
                                    onChange={(e) => setFormData({ ...formData, bookingNote: e.target.value })}
                                    placeholder="Banner ngang 1200×200, PNG/JPG/WebP"
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors"
                            >
                                Huỷ
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Đang lưu...' : slot ? 'Cập nhật' : 'Tạo slot'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
