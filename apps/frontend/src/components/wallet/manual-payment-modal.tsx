'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Copy, Check, X, Loader2, CheckCircle2, XCircle, Landmark, BellRing } from 'lucide-react';
import { usePaymentStatus, useClaimManualPaid } from '@/lib/api/hooks/use-payments';
import type { ManualPaymentInstructions } from '@/lib/api/payments.service';

interface Props {
    data: ManualPaymentInstructions;
    onClose: () => void;
    /** Gọi khi giao dịch được admin xác nhận thành công (để refetch số dư). */
    onCompleted?: () => void;
}

/** Hàng thông tin có nút sao chép. */
function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success('Đã sao chép');
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Không sao chép được');
        }
    };
    return (
        <div className="flex items-center justify-between gap-3 py-2 border-b border-outline-variant/60 last:border-0">
            <span className="text-xs text-on-surface-variant shrink-0">{label}</span>
            <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-semibold text-on-surface truncate ${mono ? 'font-mono' : ''}`}>
                    {value}
                </span>
                <button
                    type="button"
                    onClick={copy}
                    aria-label={`Sao chép ${label}`}
                    className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors shrink-0"
                >
                    {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                </button>
            </div>
        </div>
    );
}

export function ManualPaymentModal({ data, onClose, onCompleted }: Props) {
    // Poll trạng thái giao dịch để tự phát hiện khi admin xác nhận.
    const { data: live } = usePaymentStatus(data.paymentId);
    const status = live?.status ?? data.status;
    const isDone = status === 'COMPLETED';
    const isRejected = status === 'CANCELLED' || status === 'FAILED';

    // Người dùng đã bấm "Tôi đã chuyển khoản" chưa (đọc từ vòng poll).
    const claim = useClaimManualPaid();
    const claimedAt: string | undefined = live?.providerData?.userClaimedPaidAt;
    const hasClaimed = !!claimedAt;

    const handleClaim = async () => {
        try {
            await claim.mutateAsync(data.paymentId);
            toast.success('Đã báo quản trị viên. Họ sẽ đối soát và cộng xu sớm nhất.');
        } catch (e: any) {
            toast.error(
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                'Không gửi được thông báo.',
            );
        }
    };

    // Bắn callback đúng một lần khi vừa chuyển sang COMPLETED (để refetch số dư).
    const firedRef = useRef(false);
    useEffect(() => {
        if (isDone && !firedRef.current) {
            firedRef.current = true;
            onCompleted?.();
        }
    }, [isDone, onCompleted]);

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
                        <Landmark className="w-5 h-5 text-primary" /> Chuyển khoản nạp xu
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
                    {isDone ? (
                        <div className="text-center py-6">
                            <CheckCircle2 className="w-14 h-14 mx-auto text-green-600 mb-3" />
                            <p className="text-lg font-bold text-on-surface">Nạp xu thành công!</p>
                            <p className="text-sm text-on-surface-variant mt-1">
                                {data.coinAmount.toLocaleString('vi-VN')} xu đã được cộng vào ví của bạn.
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-5 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Hoàn tất
                            </button>
                        </div>
                    ) : isRejected ? (
                        <div className="text-center py-6">
                            <XCircle className="w-14 h-14 mx-auto text-rose-600 mb-3" />
                            <p className="text-lg font-bold text-on-surface">Yêu cầu đã bị huỷ</p>
                            <p className="text-sm text-on-surface-variant mt-1">
                                Nếu bạn đã chuyển khoản, vui lòng liên hệ hỗ trợ kèm mã{' '}
                                <span className="font-mono font-semibold">{data.reference}</span>.
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-5 px-5 py-2.5 bg-surface-container-high text-on-surface rounded-lg font-medium hover:bg-surface-container-highest transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-on-surface-variant">
                                Quét mã QR bằng app ngân hàng, hoặc chuyển khoản theo thông tin bên dưới.
                                Nhớ giữ <strong className="text-on-surface">đúng nội dung chuyển khoản</strong> để
                                được cộng xu tự động sau khi quản trị viên xác nhận.
                            </p>

                            {/* Ảnh QR VietQR — dùng <img> thường để không vướng next/image domain */}
                            <div className="flex justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={data.qrUrl}
                                    alt="Mã QR chuyển khoản"
                                    className="w-56 h-auto rounded-lg border border-outline-variant bg-white"
                                    loading="lazy"
                                />
                            </div>

                            {/* Thông tin ngân hàng */}
                            <div className="rounded-xl bg-surface-container-high px-4 py-2">
                                {data.bank.bankName && <CopyRow label="Ngân hàng" value={data.bank.bankName} />}
                                {data.bank.accountNumber && (
                                    <CopyRow label="Số tài khoản" value={data.bank.accountNumber} mono />
                                )}
                                {data.bank.accountHolder && (
                                    <CopyRow label="Chủ tài khoản" value={data.bank.accountHolder} />
                                )}
                                <CopyRow label="Số tiền" value={`${data.amount.toLocaleString('vi-VN')} ₫`} />
                                <CopyRow label="Nội dung CK" value={data.reference} mono />
                            </div>

                            {/* Cảnh báo nội dung CK */}
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5">
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    ⚠️ Bắt buộc ghi nội dung chuyển khoản là{' '}
                                    <span className="font-mono font-bold">{data.reference}</span> để hệ thống
                                    đối soát đúng giao dịch của bạn.
                                </p>
                            </div>

                            {data.bank.instructions && (
                                <p className="text-xs text-on-surface-variant whitespace-pre-line">
                                    {data.bank.instructions}
                                </p>
                            )}

                            {/* Báo đã chuyển khoản — để admin chủ động đối soát nếu sót
                                thông báo biến động số dư từ ngân hàng */}
                            {hasClaimed ? (
                                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-3 py-2.5">
                                    <p className="text-xs text-green-800 dark:text-green-300 text-center">
                                        ✓ Đã báo quản trị viên lúc{' '}
                                        {new Date(claimedAt!).toLocaleString('vi-VN')}. Họ sẽ đối soát và
                                        cộng xu sớm nhất.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleClaim}
                                        disabled={claim.isPending}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {claim.isPending ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" /> Đang gửi…
                                            </>
                                        ) : (
                                            <>
                                                <BellRing size={18} /> Tôi đã chuyển khoản
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[11px] text-center text-on-surface-variant/70 -mt-2">
                                        Bấm sau khi đã chuyển tiền để quản trị viên kiểm tra lại — phòng khi
                                        họ sót thông báo từ ngân hàng.
                                    </p>
                                </>
                            )}

                            {/* Trạng thái chờ */}
                            <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant pt-1">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang chờ quản trị viên xác nhận… (số dư sẽ tự cập nhật)
                            </div>

                            <p className="text-[11px] text-center text-on-surface-variant/70">
                                Bạn có thể đóng cửa sổ này. Xu sẽ được cộng sau khi CK được xác nhận, và bạn sẽ
                                nhận thông báo.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
