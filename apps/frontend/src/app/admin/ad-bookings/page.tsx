'use client';

import { useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { useAdminAdBookings, useReviewAdBooking } from '@/lib/api/hooks/use-ads';
import { AdBooking, AdBookingStatus } from '@/lib/api/ads.service';

const STATUS_TABS: Array<{ value: AdBookingStatus | undefined; label: string }> = [
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Từ chối' },
    { value: undefined, label: 'Tất cả' },
];

const STATUS_BADGE: Record<AdBookingStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    APPROVED: { label: 'Đã duyệt', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    REJECTED: { label: 'Từ chối', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    CANCELLED: { label: 'Khách hủy', cls: 'bg-surface-variant text-on-surface-variant' },
};

const vnd = (n: number) => n.toLocaleString('vi-VN') + ' đ';
// Ngày booking lưu mốc UTC — format UTC để endDate không nhảy sang hôm sau (+7).
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'UTC' });

/**
 * Duyệt đơn đặt quảng cáo self-service. Duyệt = xác nhận ĐÃ NHẬN thanh toán —
 * hệ thống tự tạo Ad + binding priority cao chạy đúng lịch của đơn.
 */
export default function AdminAdBookingsPage() {
    const [statusFilter, setStatusFilter] = useState<AdBookingStatus | undefined>('PENDING');
    const { data: bookings = [], isLoading } = useAdminAdBookings(statusFilter);
    const reviewMutation = useReviewAdBooking();
    const { toasts, showToast, removeToast } = useToast();
    const [reviewing, setReviewing] = useState<{ booking: AdBooking; action: 'APPROVED' | 'REJECTED' } | null>(null);
    const [adminNote, setAdminNote] = useState('');

    const submitReview = async () => {
        if (!reviewing) return;
        try {
            await reviewMutation.mutateAsync({
                id: reviewing.booking.id,
                data: { status: reviewing.action, adminNote: adminNote.trim() || undefined },
            });
            showToast(
                reviewing.action === 'APPROVED'
                    ? 'Đã duyệt — quảng cáo sẽ tự chạy đúng lịch của đơn.'
                    : 'Đã từ chối đơn.',
                'success',
            );
            setReviewing(null);
            setAdminNote('');
        } catch (err: any) {
            showToast(err?.response?.data?.message ?? 'Lỗi khi duyệt đơn', 'error');
        }
    };

    if (isLoading) return <Loading />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-on-surface">Đơn đặt quảng cáo</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                    Duyệt = xác nhận <strong>đã nhận thanh toán</strong>. Hệ thống tự tạo Ad chạy đúng lịch,
                    ưu tiên cao hơn ads network trong cùng slot.
                </p>
            </div>

            <div className="flex gap-2">
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.label}
                        onClick={() => setStatusFilter(t.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === t.value
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {bookings.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant bg-surface-container rounded-lg">
                    Không có đơn nào.
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b) => {
                        const badge = STATUS_BADGE[b.status];
                        return (
                            <div key={b.id} className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                                    <span className="font-semibold text-on-surface">{b.slot?.label}</span>
                                    <span className="px-2 py-0.5 text-xs bg-surface-container-high rounded font-mono text-on-surface-variant">
                                        {b.slot?.key}
                                    </span>
                                    <span className="ml-auto text-lg font-bold text-primary">{vnd(b.totalPrice)}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-on-surface-variant">
                                    <p>Lịch chạy: <span className="text-on-surface font-medium">{fmtDay(b.startDate)} – {fmtDay(b.endDate)}</span> ({b.days} ngày × {vnd(b.pricePerDay)})</p>
                                    <p>Khách: <span className="text-on-surface font-medium">{b.contactName}</span> · {b.contactPhone}{b.contactEmail ? ` · ${b.contactEmail}` : ''}</p>
                                    {b.companyName && <p>Doanh nghiệp: {b.companyName}</p>}
                                    <p>Tài khoản: {b.user?.displayName || b.user?.username} ({b.user?.email})</p>
                                    {b.title && <p>Tiêu đề: {b.title}</p>}
                                    {b.linkUrl && (
                                        <p>
                                            Link đích:{' '}
                                            <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                                                {b.linkUrl}
                                            </a>
                                        </p>
                                    )}
                                    {b.note && <p className="md:col-span-2">Ghi chú khách: {b.note}</p>}
                                    {b.adminNote && <p className="md:col-span-2 italic">Ghi chú admin: {b.adminNote}</p>}
                                    <p className="md:col-span-2 text-xs">Gửi lúc {new Date(b.createdAt).toLocaleString('vi-VN')}</p>
                                </div>

                                {b.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={b.imageUrl} alt="Creative" className="mt-3 max-h-32 rounded-lg border border-outline-variant" />
                                ) : (
                                    <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                                        Chưa có ảnh banner — cần khách bổ sung trước khi duyệt.
                                    </p>
                                )}

                                {b.status === 'PENDING' && (
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => { setReviewing({ booking: b, action: 'APPROVED' }); setAdminNote(''); }}
                                            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:bg-primary/90"
                                        >
                                            Duyệt (đã nhận thanh toán)
                                        </button>
                                        <button
                                            onClick={() => { setReviewing({ booking: b, action: 'REJECTED' }); setAdminNote(''); }}
                                            className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                )}
                                {b.status === 'APPROVED' && b.ad?.id && (
                                    <a
                                        href={`/admin/ads/${b.ad.id}/analytics`}
                                        className="inline-block mt-4 px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container-high"
                                    >
                                        Xem analytics ad
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {reviewing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReviewing(null)}>
                    <div className="bg-surface-container rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-on-surface mb-2">
                            {reviewing.action === 'APPROVED' ? 'Duyệt đơn' : 'Từ chối đơn'}
                        </h2>
                        <p className="text-sm text-on-surface-variant mb-4">
                            {reviewing.action === 'APPROVED'
                                ? `Xác nhận ĐÃ NHẬN ${vnd(reviewing.booking.totalPrice)} cho đơn "${reviewing.booking.slot?.label}"? Ad sẽ tự chạy ${fmtDay(reviewing.booking.startDate)} – ${fmtDay(reviewing.booking.endDate)}.`
                                : 'Nhập lý do từ chối để khách nắm được (hiển thị cho khách).'}
                        </p>
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={3}
                            placeholder={reviewing.action === 'APPROVED' ? 'Ghi chú (tùy chọn)…' : 'Lý do từ chối…'}
                            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface text-sm mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setReviewing(null)}
                                className="flex-1 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high"
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={submitReview}
                                disabled={reviewMutation.isPending}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium text-on-primary disabled:opacity-50 ${reviewing.action === 'APPROVED' ? 'bg-primary hover:bg-primary/90' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {reviewMutation.isPending ? 'Đang xử lý…' : reviewing.action === 'APPROVED' ? 'Xác nhận duyệt' : 'Từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
