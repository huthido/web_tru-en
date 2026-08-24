'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Sparkles } from 'lucide-react';
import { useSubscribeTts, useTtsSubscription } from '@/lib/api/hooks/use-tts-subscription';
import type { TtsSubscriptionInfo, TtsSubscriptionPlan } from '@/lib/api/tts.service';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatCoins = (n: number) => n.toLocaleString('vi-VN');

/** Số ngày còn lại (làm tròn lên), 0 nếu đã hết hạn. */
const daysLeft = (iso: string) =>
    Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

const errorText = (error: any, fallback: string) =>
    error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

/** Mức rẻ nhất tính theo tháng — để gắn nhãn "Tiết kiệm x%" cho gói dài. */
const savingPercent = (plan: TtsSubscriptionPlan, plans: TtsSubscriptionPlan[]) => {
    const base = plans.find((p) => p.months === 1);
    if (!base || base.coins <= 0 || plan.months <= 1) return 0;
    const full = base.coins * plan.months;
    return full > plan.coins ? Math.round(((full - plan.coins) / full) * 100) : 0;
};

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Gọi sau khi mua thành công (vd: chạy tiếp thao tác tạo audio đang chờ). */
    onSubscribed?: (info: TtsSubscriptionInfo) => void;
    onError?: (message: string) => void;
}

/**
 * Modal chọn mức gói (1 / 2 / 3 tháng… theo bảng giá admin) rồi xác nhận
 * trừ xu. Dùng chung cho card trạng thái và luồng "bấm Tạo giọng AI khi
 * chưa có gói".
 */
export function TtsSubscribeModal({ isOpen, onClose, onSubscribed, onError }: SubscribeModalProps) {
    const { data: sub, isLoading } = useTtsSubscription(isOpen);
    const subscribe = useSubscribeTts();
    const plans = sub?.plans ?? [];
    const [months, setMonths] = useState<number | null>(null);

    // Mặc định chọn mức đầu tiên (ngắn nhất) mỗi lần mở.
    useEffect(() => {
        if (isOpen) setMonths(plans[0]?.months ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, plans.length]);

    if (!isOpen) return null;

    const renewing = !!sub?.active && !!sub.expiresAt;
    const selected = plans.find((p) => p.months === months) ?? null;
    const busy = subscribe.isPending;

    const confirm = async () => {
        if (!selected) return;
        try {
            const info = await subscribe.mutateAsync(selected.months);
            onClose();
            onSubscribed?.(info);
        } catch (error: any) {
            onError?.(errorText(error, 'Không mua được gói, thử lại sau'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
            <div
                className="relative bg-surface-container rounded-xl shadow-2xl max-w-md w-full overflow-hidden z-10 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tts-subscribe-title"
            >
                <div className="px-6 pt-6 pb-3">
                    <h3 id="tts-subscribe-title" className="text-xl font-semibold text-on-surface">
                        {renewing ? 'Gia hạn gói giọng đọc AI' : 'Đăng ký gói giọng đọc AI'}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                        {renewing
                            ? `Thời hạn mới cộng dồn vào hạn hiện tại (${formatDate(sub!.expiresAt!)}). `
                            : 'Trong thời hạn gói bạn tạo (và tạo lại) audio AI cho mọi chương miễn phí của mình không giới hạn. '}
                        Xu đã trừ không hoàn lại.
                    </p>
                </div>

                <div className="px-6 pb-5">
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-on-surface-variant">
                            <Loader2 size={16} className="animate-spin" /> Đang tải bảng giá…
                        </div>
                    ) : plans.length === 0 ? (
                        <p className="py-4 text-sm text-on-surface-variant italic">
                            Giọng đọc AI hiện miễn phí — bạn không cần mua gói.
                        </p>
                    ) : (
                        <div className="grid gap-2" role="radiogroup" aria-label="Chọn gói">
                            {plans.map((plan) => {
                                const active = plan.months === months;
                                const save = savingPercent(plan, plans);
                                return (
                                    <button
                                        key={plan.months}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        disabled={busy}
                                        onClick={() => setMonths(plan.months)}
                                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                                            active
                                                ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                                : 'border-outline-variant hover:bg-surface-container-high'
                                        }`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-on-surface">
                                                {plan.months} tháng
                                                <span className="font-normal text-on-surface-variant"> · {plan.months * (sub?.daysPerMonth ?? 30)} ngày</span>
                                            </p>
                                            {save > 0 && (
                                                <p className="text-xs text-green-700 dark:text-green-400">Tiết kiệm {save}% so với mua từng tháng</p>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                                            {plan.coins === 0 ? 'Miễn phí' : `${formatCoins(plan.coins)} xu`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-surface-container-low/50 px-6 py-4 flex gap-3 justify-end border-t border-outline-variant">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="px-5 py-2.5 bg-surface-container border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={busy || !selected}
                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        {busy
                            ? 'Đang xử lý…'
                            : selected
                                ? `Trừ ${formatCoins(selected.coins)} xu & ${renewing ? 'gia hạn' : 'đăng ký'} ${selected.months} tháng`
                                : 'Chọn gói'}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface CardProps {
    /** Dạng thanh gọn (trang chương) thay vì card đầy đủ (bảng điều khiển). */
    compact?: boolean;
    className?: string;
}

/**
 * Trạng thái gói tháng giọng đọc AI + nút đăng ký / gia hạn. Tự ẩn khi
 * admin chưa có bảng giá (gói không bắt buộc) hoặc user là admin.
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
    const cheapest = sub.plans[0];

    const statusText = active
        ? `Gói giọng đọc AI còn hạn đến ${formatDate(sub.expiresAt!)} (${left} ngày)`
        : sub.expiresAt
            ? `Gói giọng đọc AI đã hết hạn ngày ${formatDate(sub.expiresAt)}`
            : 'Bạn chưa đăng ký gói giọng đọc AI theo tháng';
    const priceList = sub.plans.map((p) => `${p.months} tháng ${formatCoins(p.coins)} xu`).join(' · ');
    const detailText = active
        ? 'Trong thời hạn gói, bạn tạo audio AI cho mọi chương miễn phí không giới hạn.'
        : `Bảng giá: ${priceList}. Mua gói để tự tạo giọng đọc AI cho chương của bạn.`;

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
                        {(!compact || !active) && <p className="text-xs text-on-surface-variant mt-0.5">{detailText}</p>}
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
                    {active
                        ? 'Gia hạn gói'
                        : cheapest
                            ? `Mua gói từ ${formatCoins(cheapest.coins)} xu`
                            : 'Mua gói'}
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
