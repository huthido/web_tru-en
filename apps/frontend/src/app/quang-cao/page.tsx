'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/api/hooks/use-auth';
import {
    useBookableSlots,
    useCreateAdBooking,
    useMyAdBookings,
    useCancelAdBooking,
} from '@/lib/api/hooks/use-ads';
import { adBookingsService, BookableSlot, AdBooking } from '@/lib/api/ads.service';
import { Megaphone, CalendarDays, ImagePlus, X } from 'lucide-react';

/** Nhãn tiếng Việt cho pageKey của slot. */
const PAGE_LABELS: Record<string, string> = {
    'home': 'Trang chủ',
    'stories.list': 'Danh sách truyện',
    'stories.detail': 'Trang chi tiết truyện',
    'reading': 'Trang đọc chương',
    'search': 'Trang tìm kiếm',
    'profile': 'Trang cá nhân',
    'library': 'Thư viện',
};

const POSITION_LABELS: Record<string, string> = {
    TOP: 'Banner đầu trang',
    BOTTOM: 'Banner cuối trang',
    SIDEBAR_LEFT: 'Cột bên trái',
    SIDEBAR_RIGHT: 'Cột bên phải',
    INLINE: 'Chèn giữa nội dung',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    APPROVED: { label: 'Đang chạy / Đã duyệt', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    REJECTED: { label: 'Từ chối', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    CANCELLED: { label: 'Đã hủy', cls: 'bg-surface-variant text-on-surface-variant' },
};

const vnd = (n: number) => n.toLocaleString('vi-VN') + ' đ';
// Ngày booking lưu mốc UTC (start 00:00, end 23:59:59.999) — phải format theo
// UTC, nếu không endDate sẽ nhảy sang ngày hôm sau ở múi giờ VN (+7).
const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

/** Số ngày chạy tính cả 2 đầu; 0 nếu input chưa hợp lệ. */
function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 86_400_000) + 1;
}

const inputCls =
    'w-full px-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary';

function BookingForm({
    slot,
    onClose,
    onDone,
    showToast,
}: {
    slot: BookableSlot;
    onClose: () => void;
    onDone: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [title, setTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [note, setNote] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const createBooking = useCreateAdBooking();
    const days = calcDays(startDate, endDate);
    const total = days * slot.pricePerDay;

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const { imageUrl: url } = await adBookingsService.uploadImage(file);
            setImageUrl(url);
            showToast('Đã tải ảnh banner lên.', 'success');
        } catch {
            showToast('Tải ảnh thất bại, thử lại giúp bạn nhé.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactName.trim() || !contactPhone.trim()) {
            showToast('Vui lòng nhập tên và số điện thoại liên hệ.', 'warning');
            return;
        }
        if (days <= 0) {
            showToast('Khoảng ngày chưa hợp lệ.', 'warning');
            return;
        }
        try {
            await createBooking.mutateAsync({
                slotId: slot.id,
                startDate,
                endDate,
                title: title.trim() || undefined,
                imageUrl: imageUrl || undefined,
                linkUrl: linkUrl.trim() || undefined,
                contactName: contactName.trim(),
                contactPhone: contactPhone.trim(),
                contactEmail: contactEmail.trim() || undefined,
                companyName: companyName.trim() || undefined,
                note: note.trim() || undefined,
            });
            showToast('Đã gửi đơn đặt quảng cáo! Chúng tôi sẽ liên hệ xác nhận thanh toán.', 'success');
            onDone();
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Gửi đơn thất bại.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-container rounded-2xl shadow-xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-on-surface">Đặt quảng cáo: {slot.label}</h2>
                        <p className="text-sm text-on-surface-variant">
                            {PAGE_LABELS[slot.pageKey] ?? slot.pageKey} · {POSITION_LABELS[slot.position] ?? slot.position} ·{' '}
                            <span className="font-semibold text-primary">{vnd(slot.pricePerDay)}/ngày</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container-high" aria-label="Đóng">
                        <X size={18} className="text-on-surface-variant" />
                    </button>
                </div>

                {slot.bookedRanges.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
                        Đã kín lịch:{' '}
                        {slot.bookedRanges.map((r, i) => (
                            <span key={i} className="font-medium">
                                {i > 0 && ', '}
                                {fmtDay(r.startDate)} – {fmtDay(r.endDate)}
                            </span>
                        ))}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-sm font-medium text-on-surface">Ngày bắt đầu *</span>
                            <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls + ' mt-1'} required />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-on-surface">Ngày kết thúc *</span>
                            <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls + ' mt-1'} required />
                        </label>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-container-high flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">
                            {days > 0 ? `${days} ngày × ${vnd(slot.pricePerDay)}` : 'Chọn khoảng ngày để xem giá'}
                        </span>
                        <span className="text-lg font-bold text-primary">{days > 0 ? vnd(total) : '—'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-sm font-medium text-on-surface">Tên người liên hệ *</span>
                            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls + ' mt-1'} placeholder="Nguyễn Văn A" required />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-on-surface">Số điện thoại *</span>
                            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls + ' mt-1'} placeholder="09xx xxx xxx" required />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-on-surface">Email</span>
                            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls + ' mt-1'} placeholder="lienhe@congty.vn" />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium text-on-surface">Tên doanh nghiệp / thương hiệu</span>
                            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls + ' mt-1'} placeholder="Công ty ABC" />
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-on-surface">Tiêu đề quảng cáo</span>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls + ' mt-1'} placeholder="Khuyến mãi hè 2026…" />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-on-surface">Link đích khi click</span>
                        <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={inputCls + ' mt-1'} placeholder="https://…" />
                    </label>

                    <div>
                        <span className="text-sm font-medium text-on-surface">Ảnh banner</span>
                        <p className="text-xs text-on-surface-variant mb-2">
                            {slot.bookingNote || 'Có thể gửi sau — đội ngũ sẽ liên hệ nhận creative trước khi chạy.'}
                        </p>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                        {imageUrl ? (
                            <div className="relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageUrl} alt="Banner preview" className="max-h-32 rounded-lg border border-outline-variant" />
                                <button type="button" onClick={() => setImageUrl('')} className="absolute -top-2 -right-2 p-1 rounded-full bg-surface-container-high shadow" aria-label="Xóa ảnh">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-outline-variant text-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                            >
                                <ImagePlus size={16} />
                                {uploading ? 'Đang tải…' : 'Tải ảnh banner lên'}
                            </button>
                        )}
                    </div>

                    <label className="block">
                        <span className="text-sm font-medium text-on-surface">Ghi chú</span>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls + ' mt-1'} placeholder="Yêu cầu thêm về chiến dịch…" />
                    </label>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={createBooking.isPending || days <= 0}
                            className="px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold disabled:opacity-50"
                        >
                            {createBooking.isPending ? 'Đang gửi…' : `Gửi đơn đặt${days > 0 ? ` · ${vnd(total)}` : ''}`}
                        </button>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                        Sau khi gửi đơn, chúng tôi sẽ liên hệ hướng dẫn thanh toán (chuyển khoản). Quảng cáo chạy tự động đúng lịch ngay khi đơn được xác nhận.
                    </p>
                </form>
            </div>
        </div>
    );
}

function MyBookings({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
    const { data: bookings, isLoading } = useMyAdBookings();
    const cancelBooking = useCancelAdBooking();

    if (isLoading) return <div className="py-12 flex justify-center"><Loading /></div>;
    if (!bookings?.length) {
        return (
            <div className="bg-surface-container rounded-lg p-12 text-center shadow-sm">
                <Megaphone size={48} className="mx-auto mb-4 text-on-surface-variant" />
                <p className="text-on-surface-variant">Bạn chưa có đơn đặt quảng cáo nào.</p>
            </div>
        );
    }

    const handleCancel = async (b: AdBooking) => {
        try {
            await cancelBooking.mutateAsync(b.id);
            showToast('Đã hủy đơn.', 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Hủy đơn thất bại.', 'error');
        }
    };

    return (
        <div className="space-y-4">
            {bookings.map((b) => {
                const st = STATUS_META[b.status] ?? STATUS_META.PENDING;
                return (
                    <div key={b.id} className="bg-surface-container rounded-lg p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                            <span className="font-semibold text-on-surface">{b.slot?.label ?? b.slotId}</span>
                            <span className="text-xs text-on-surface-variant">({PAGE_LABELS[b.slot?.pageKey ?? ''] ?? b.slot?.pageKey})</span>
                        </div>
                        <div className="text-sm text-on-surface-variant space-y-1">
                            <p>
                                <CalendarDays size={14} className="inline mr-1" />
                                {fmtDay(b.startDate)} – {fmtDay(b.endDate)} ({b.days} ngày) ·{' '}
                                <span className="font-semibold text-on-surface">{vnd(b.totalPrice)}</span>
                            </p>
                            {b.status === 'APPROVED' && b.ad && (
                                <p>
                                    Hiệu quả: {b.ad.impressions ?? b.ad.viewCount ?? 0} lượt hiển thị · {b.ad.clickCount ?? 0} lượt click
                                </p>
                            )}
                            {b.adminNote && <p className="italic">Phản hồi: {b.adminNote}</p>}
                        </div>
                        {b.status === 'PENDING' && (
                            <button
                                onClick={() => handleCancel(b)}
                                disabled={cancelBooking.isPending}
                                className="mt-3 px-3 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                            >
                                Hủy đơn
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function AdvertisingContent() {
    const { user } = useAuth();
    const { toasts, showToast, removeToast } = useToast();
    const { data: slots, isLoading } = useBookableSlots();
    const [activeTab, setActiveTab] = useState<'pricing' | 'my'>('pricing');
    const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);

    const grouped = useMemo(() => {
        const map = new Map<string, BookableSlot[]>();
        (slots ?? []).forEach((s) => {
            const arr = map.get(s.pageKey) ?? [];
            arr.push(s);
            map.set(s.pageKey, arr);
        });
        return Array.from(map.entries());
    }, [slots]);

    return (
        <div className="min-h-screen bg-surface transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-60 pb-16 md:pb-0">
                <Header />
                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-6 md:mb-8">
                            <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2 flex items-center gap-2">
                                <Megaphone className="text-primary" />
                                Quảng cáo trên YÊU
                            </h1>
                            <p className="text-sm md:text-base text-on-surface-variant max-w-3xl">
                                Chọn vị trí hiển thị, khoảng ngày chạy và gửi đơn — giá niêm yết theo ngày cho từng vị trí.
                                Sau khi xác nhận thanh toán, quảng cáo của bạn tự động chạy đúng lịch và có báo cáo lượt hiển thị / lượt click.
                            </p>
                        </div>

                        <div className="bg-surface-container rounded-lg p-1 mb-6 shadow-sm flex gap-2">
                            <button
                                onClick={() => setActiveTab('pricing')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pricing' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                            >
                                Bảng giá & đặt chỗ
                            </button>
                            <button
                                onClick={() => setActiveTab('my')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                            >
                                Đơn của tôi
                            </button>
                        </div>

                        {activeTab === 'pricing' && (
                            isLoading ? (
                                <div className="py-12 flex justify-center"><Loading /></div>
                            ) : !slots?.length ? (
                                <div className="bg-surface-container rounded-lg p-12 text-center shadow-sm">
                                    <Megaphone size={48} className="mx-auto mb-4 text-on-surface-variant" />
                                    <p className="text-on-surface-variant mb-2">Bảng giá đang được cập nhật.</p>
                                    <p className="text-sm text-on-surface-variant">
                                        Vui lòng <Link href="/lien-he-quang-cao" className="text-primary underline">liên hệ trực tiếp</Link> để đặt quảng cáo.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {grouped.map(([pageKey, pageSlots]) => (
                                        <section key={pageKey}>
                                            <h2 className="text-lg font-semibold text-on-surface mb-3">
                                                {PAGE_LABELS[pageKey] ?? pageKey}
                                            </h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {pageSlots.map((slot) => (
                                                    <div key={slot.id} className="bg-surface-container rounded-xl p-4 shadow-sm flex flex-col">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-on-surface">{slot.label}</p>
                                                            <p className="text-xs text-on-surface-variant mb-2">
                                                                {POSITION_LABELS[slot.position] ?? slot.position}
                                                            </p>
                                                            <p className="text-xl font-bold text-primary mb-1">
                                                                {vnd(slot.pricePerDay)}<span className="text-sm font-medium text-on-surface-variant">/ngày</span>
                                                            </p>
                                                            {slot.bookingNote && (
                                                                <p className="text-xs text-on-surface-variant mb-2">{slot.bookingNote}</p>
                                                            )}
                                                            {slot.bookedRanges.length > 0 && (
                                                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                                                    Đã kín: {slot.bookedRanges.map((r) => `${fmtDay(r.startDate)}–${fmtDay(r.endDate)}`).join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {user ? (
                                                            <button
                                                                onClick={() => setSelectedSlot(slot)}
                                                                className="mt-3 w-full px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
                                                            >
                                                                Đặt vị trí này
                                                            </button>
                                                        ) : (
                                                            <Link
                                                                href="/login?redirect=/quang-cao"
                                                                className="mt-3 w-full px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold text-center hover:opacity-90"
                                                            >
                                                                Đăng nhập để đặt
                                                            </Link>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                    <p className="text-xs text-on-surface-variant">
                                        Cần chiến dịch dài hạn, nhiều vị trí hoặc định dạng riêng?{' '}
                                        <Link href="/lien-he-quang-cao" className="text-primary underline">Liên hệ trực tiếp</Link> để nhận báo giá tùy chỉnh.
                                    </p>
                                </div>
                            )
                        )}

                        {activeTab === 'my' && (
                            user ? (
                                <MyBookings showToast={showToast} />
                            ) : (
                                <div className="bg-surface-container rounded-lg p-12 text-center shadow-sm">
                                    <p className="text-on-surface-variant mb-4">Đăng nhập để xem đơn đặt quảng cáo của bạn.</p>
                                    <Link href="/login?redirect=/quang-cao" className="inline-block px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold">
                                        Đăng nhập
                                    </Link>
                                </div>
                            )
                        )}
                    </div>
                </main>
                <Footer />
            </div>

            {selectedSlot && (
                <BookingForm
                    slot={selectedSlot}
                    onClose={() => setSelectedSlot(null)}
                    onDone={() => {
                        setSelectedSlot(null);
                        setActiveTab('my');
                    }}
                    showToast={showToast}
                />
            )}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}

export default function AdvertisingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-surface flex items-center justify-center">
                    <Loading />
                </div>
            }
        >
            <AdvertisingContent />
        </Suspense>
    );
}
