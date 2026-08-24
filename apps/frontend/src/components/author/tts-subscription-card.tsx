'use client';

import { useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useSubscribeTts, useTtsSubscription } from '@/lib/api/hooks/use-tts-subscription';
import type { TtsSubscriptionInfo } from '@/lib/api/tts.service';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Số ngày còn lại (làm tròn lên), 0 nếu đã hết hạn. */
const daysLeft = (iso: string) =>
    Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

const errorText = (error: any, fallback: string) =>
    error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Gọi sau khi mua thành công (vd: chạy tiếp thao tác tạo audio đang chờ). */
    onSubscribed?: (info: TtsSubscriptionInfo) => void;
    onError?: (message: string) => void;
}

/**
 * Modal xác nhận mua / gia hạn gói tháng giọng đọc AI bằng xu. Dùng chung
 * cho card trạng thái và cho luồng "bấm Tạo giọng AI khi chưa có gói".
 */
export function TtsSubscribeModal({ isOpen, onClose, onSubscribed, onError }: SubscribeModalProps) {
    const { data: sub } = useTtsSubscription(isOpen);
    const subscribe = useSubscribeTts();
    const cost = sub?.cost ?? 0;
    const days = sub?.days ?? 30;
    const renewing = !!sub?.active && !!sub.expiresAt;

    const message = renewing
        ? `Gia hạn thêm ${days} ngày (cộng dồn vào hạn hiện tại ${formatDate(sub!.expiresAt!)}) ` +
          `với giá ${cost} xu. Trong thời hạn gói bạn tạo giọng đọc AI cho bao nhiêu chương cũng được. ` +
          'Xu đã trừ không hoàn lại.'
        : `Gói giọng đọc AI ${days} ngày giá ${cost} xu — trong thời hạn gói bạn tạo (và tạo lại) ` +
          'audio AI cho mọi chương miễn phí của mình không giới hạn số lượng. Xu đã trừ không hoàn lại. Tiếp tục?';

    return (
        <ConfirmModal
            isOpen={isOpen}
            title={renewing ? 'Gia hạn gói giọng đọc AI' : 'Đăng ký gói giọng đọc AI theo tháng'}
            message={message}
            confirmText={subscribe.isPending ? 'Đang xử lý…' : `Trừ ${cost} xu & ${renewing ? 'gia hạn' : 'đăng ký'}`}
            cancelText="Hủy"
            isLoading={subscribe.isPending}
            onConfirm={async () => {
                try {
                    const info = await subscribe.mutateAsync();
                    onClose();
                    onSubscribed?.(info);
                } catch (error: any) {
                    onError?.(errorText(error, 'Không mua được gói, thử lại sau'));
                }
            }}
            onClose={onClose}
        />
    );
}

interface CardProps {
    /** Dạng thanh gọn (trang chương) thay vì card đầy đủ (bảng điều khiển). */
    compact?: boolean;
    className?: string;
}

/**
 * Trạng thái gói tháng giọng đọc AI + nút đăng ký / gia hạn. Tự ẩn khi
 * admin không đặt phí (gói không bắt buộc) hoặc user là admin.
 */
export function TtsSubscriptionCard({ compact = false, className = '' }: CardProps) {
    const { data: sub, isLoading } = useTtsSubscription();
    const [modalOpen, setModalOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    if (isLoading || !sub || !sub.required) return null;

    const active = sub.active && !!sub.expiresAt;
    const left = active ? daysLeft(sub.expiresAt!) : 0;
    const expiringSoon = active && left <= 5;

    const statusText = active
        ? `Gói giọng đọc AI còn hạn đến ${formatDate(sub.expiresAt!)} (${left} ngày)`
        : sub.expiresAt
            ? `Gói giọng đọc AI đã hết hạn ngày ${formatDate(sub.expiresAt)}`
            : 'Bạn chưa đăng ký gói giọng đọc AI theo tháng';
    const detailText = active
        ? 'Trong thời hạn gói, bạn tạo audio AI cho mọi chương miễn phí không giới hạn.'
        : `Đăng ký ${sub.cost} xu / ${sub.days} ngày để tự tạo giọng đọc AI cho chương của bạn.`;

    const tone = active
        ? expiringSoon
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
            : 'border-outline-variant bg-surface-container'
        : 'border-primary/40 bg-primary/5';

    return (
        <div className={`rounded-lg border p-4 ${tone} ${compact ? 'mb-6' : 'mb-4'} ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    {active ? (
                        <CalendarClock size={20} className={expiringSoon ? 'text-amber-600 dark:text-amber-400 mt-0.5' : 'text-primary mt-0.5'} />
                    ) : (
                        <Sparkles size={20} className="text-primary mt-0.5" />
                    )}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">{statusText}</p>
                        {!compact && <p className="text-xs text-on-surface-variant mt-0.5">{detailText}</p>}
                        {compact && !active && <p className="text-xs text-on-surface-variant mt-0.5">{detailText}</p>}
                        {notice && <p className="text-xs text-green-700 dark:text-green-400 mt-1">{notice}</p>}
                        {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setNotice('');
                        setError('');
                        setModalOpen(true);
                    }}
                    className={
                        active
                            ? 'px-4 py-2 border border-outline-variant text-primary hover:bg-surface-container-high rounded-lg text-sm font-medium transition-colors whitespace-nowrap'
                            : 'px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-2'
                    }
                >
                    {!active && <Sparkles size={16} />}
                    {active ? `Gia hạn (${sub.cost} xu)` : `Đăng ký ${sub.cost} xu / ${sub.days} ngày`}
                </button>
            </div>

            <TtsSubscribeModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubscribed={(info) =>
                    setNotice(
                        info.expiresAt
                            ? `Đã ${active ? 'gia hạn' : 'đăng ký'} — gói còn hạn đến ${formatDate(info.expiresAt)}`
                            : 'Đã đăng ký gói',
                    )
                }
                onError={setError}
            />
        </div>
    );
}
