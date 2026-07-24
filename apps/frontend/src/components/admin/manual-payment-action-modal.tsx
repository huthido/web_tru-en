'use client';

import { useState } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Undo2 } from 'lucide-react';
import type { AdminManualPayment } from '@/lib/api/payments.service';

export type ManualPaymentAction = 'CONFIRM' | 'REJECT' | 'REVERT';

interface Props {
    payment: AdminManualPayment;
    action: ManualPaymentAction;
    busy?: boolean;
    onClose: () => void;
    onSubmit: (note?: string) => void;
}

/**
 * Modal xử lý một đơn chuyển khoản thủ công.
 *
 * Thay cho window.confirm trước đây — popup cũ không hiện số tiền / mã CK nên
 * admin dễ bấm theo quán tính và cộng xu cho đơn CHƯA thực nhận tiền. Ở đây:
 *   - Hiện đủ số tiền + mã CK để đối chiếu trực tiếp với sao kê ngân hàng.
 *   - CONFIRM / REVERT bắt buộc tick ô cam kết đã đối soát thì nút mới mở khoá.
 */
export function ManualPaymentActionModal({ payment, action, busy, onClose, onSubmit }: Props) {
    const [note, setNote] = useState('');
    const [checked, setChecked] = useState(false);

    const amountText = `${payment.amount.toLocaleString('vi-VN')} ₫`;
    const coinText = `${payment.coinAmount.toLocaleString('vi-VN')} xu`;
    const who = payment.user?.displayName || payment.user?.username || '—';

    // CONFIRM và REVERT đều đụng tới ví thật → bắt buộc cam kết.
    const needsCheck = action === 'CONFIRM' || action === 'REVERT';
    const canSubmit = (!needsCheck || checked) && !busy;

    const cfg = {
        CONFIRM: {
            title: 'Xác nhận đã nhận tiền',
            icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
            checkLabel: `Tôi đã kiểm tra sao kê ngân hàng và xác nhận đã nhận đủ ${amountText} với nội dung ${payment.txnRef}.`,
            submitLabel: `Xác nhận & cộng ${coinText}`,
            submitCls: 'bg-green-600 hover:bg-green-700 text-white',
            warn: `Xu sẽ được cộng NGAY vào ví của người dùng. Chỉ bấm khi tiền đã thực sự vào tài khoản.`,
            warnCls: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300',
            showNote: false,
        },
        REJECT: {
            title: 'Từ chối yêu cầu nạp',
            icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
            checkLabel: '',
            submitLabel: 'Từ chối yêu cầu',
            submitCls: 'bg-red-600 hover:bg-red-700 text-white',
            warn: 'Không cộng xu. Người dùng sẽ nhận thông báo kèm lý do bên dưới.',
            warnCls: 'bg-surface-container-high border-outline-variant text-on-surface-variant',
            showNote: true,
        },
        REVERT: {
            title: 'Thu hồi giao dịch đã xác nhận',
            icon: <Undo2 className="w-5 h-5 text-red-600" />,
            checkLabel: `Tôi xác nhận giao dịch này KHÔNG có tiền thật và cần thu hồi ${coinText}.`,
            submitLabel: `Thu hồi ${coinText}`,
            submitCls: 'bg-red-600 hover:bg-red-700 text-white',
            warn: `Sẽ trừ lại xu đã cộng (tối đa phần xu nạp còn lại — nếu người dùng đã tiêu hết thì nền tảng chịu phần chênh). Trạng thái chuyển thành REFUNDED.`,
            warnCls: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300',
            showNote: true,
        },
    }[action];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-surface-container rounded-2xl shadow-xl border border-outline-variant w-full max-w-md my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
                    <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                        {cfg.icon} {cfg.title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {/* Thông tin đối soát — số tiền & mã CK làm nổi bật nhất */}
                    <div className="rounded-xl bg-surface-container-high divide-y divide-outline-variant/60">
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs text-on-surface-variant">Người nạp</span>
                            <span className="text-sm font-medium text-on-surface text-right">
                                {who}
                                {payment.user?.email && (
                                    <span className="block text-[11px] text-on-surface-variant">
                                        {payment.user.email}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-on-surface-variant mb-0.5">Số tiền cần nhận</p>
                            <p className="text-2xl font-extrabold text-on-surface">{amountText}</p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-on-surface-variant mb-0.5">
                                Nội dung chuyển khoản (mã đối soát)
                            </p>
                            <p className="text-xl font-mono font-bold tracking-wide text-on-surface">
                                {payment.txnRef}
                            </p>
                        </div>
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs text-on-surface-variant">Gói · số xu</span>
                            <span className="text-sm font-medium text-on-surface">
                                {payment.package?.name || '—'} · {coinText}
                            </span>
                        </div>
                    </div>

                    {/* Cảnh báo hệ quả */}
                    <div className={`rounded-lg border px-3 py-2.5 ${cfg.warnCls}`}>
                        <p className="text-xs">{cfg.warn}</p>
                    </div>

                    {/* Lý do (REJECT / REVERT) */}
                    {cfg.showNote && (
                        <div>
                            <label className="text-xs text-on-surface-variant block mb-1">
                                Lý do {action === 'REJECT' ? '(gửi tới người dùng)' : '(lưu lại + gửi người dùng)'}
                            </label>
                            <textarea
                                rows={2}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={
                                    action === 'REJECT'
                                        ? 'VD: Không nhận được tiền sau 24h.'
                                        : 'VD: Xác nhận nhầm, thực tế chưa nhận được tiền.'
                                }
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant text-sm"
                            />
                        </div>
                    )}

                    {/* Cam kết đã đối soát */}
                    {needsCheck && (
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                                className="mt-0.5 w-4 h-4 shrink-0 text-primary border-outline-variant rounded focus:ring-primary"
                            />
                            <span className="text-xs text-on-surface">{cfg.checkLabel}</span>
                        </label>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-5 py-4 border-t border-outline-variant">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                    >
                        Huỷ
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubmit(note.trim() || undefined)}
                        disabled={!canSubmit}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${cfg.submitCls}`}
                    >
                        {busy ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Đang xử lý…
                            </>
                        ) : (
                            cfg.submitLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
