'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useMyPayments } from '@/lib/api/hooks/use-payments';
import type { MyPayment, PaymentStatus } from '@/lib/api/payments.service';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    Loader2,
    Store,
    Home,
} from 'lucide-react';

/** Nhãn + màu cho từng trạng thái giao dịch. */
function statusMeta(status: PaymentStatus) {
    switch (status) {
        case 'COMPLETED':
            return { label: 'Thành công', cls: 'text-green-600 dark:text-green-400' };
        case 'PENDING':
            return { label: 'Đang xử lý', cls: 'text-amber-600 dark:text-amber-400' };
        case 'FAILED':
            return { label: 'Thất bại', cls: 'text-red-600 dark:text-red-400' };
        case 'CANCELLED':
            return { label: 'Đã hủy', cls: 'text-red-600 dark:text-red-400' };
        case 'REFUNDED':
            return { label: 'Đã hoàn tiền', cls: 'text-on-surface-variant' };
        default:
            return { label: status, cls: 'text-on-surface-variant' };
    }
}

function PaymentResultInner() {
    const params = useSearchParams();
    const queryClient = useQueryClient();

    const txnRef = params.get('txnRef') || '';
    const successParam = params.get('success') === 'true';

    const { data: payments, isLoading } = useMyPayments();

    // Sau khi quay về từ cổng thanh toán: làm mới số dư ví + lịch sử giao dịch
    // (IPN có thể đã cộng xu trước khi người dùng được redirect về).
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
        queryClient.invalidateQueries({ queryKey: ['payments', 'me'] });
    }, [queryClient]);

    // Trạng thái thật lấy từ /payments/me (nguồn chính xác); query param chỉ
    // dùng để đoán khi chưa khớp được giao dịch.
    const matched: MyPayment | undefined = txnRef
        ? payments?.find((p) => p.txnRef === txnRef)
        : undefined;

    // Không có txnRef => người dùng tự mở trang tra cứu: hiện danh sách gần đây.
    if (!txnRef) {
        return (
            <div className="bg-surface-container rounded-lg shadow-sm p-6 md:p-8 border border-outline-variant">
                <h1 className="text-xl md:text-2xl font-bold text-on-surface mb-4">
                    Lịch sử nạp xu
                </h1>
                {isLoading ? (
                    <div className="flex items-center text-on-surface-variant py-6">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải...
                    </div>
                ) : !payments || payments.length === 0 ? (
                    <p className="text-on-surface-variant py-6">Bạn chưa có giao dịch nạp xu nào.</p>
                ) : (
                    <ul className="divide-y divide-outline-variant/40">
                        {payments.map((p) => {
                            const meta = statusMeta(p.status);
                            return (
                                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-on-surface truncate">
                                            {p.package?.name || `${p.coinAmount.toLocaleString('vi-VN')} xu`}
                                        </p>
                                        <p className="text-xs text-on-surface-variant">
                                            {new Date(p.createdAt).toLocaleString('vi-VN')} ·{' '}
                                            {p.amount.toLocaleString('vi-VN')} ₫
                                        </p>
                                    </div>
                                    <span className={`text-sm font-semibold flex-shrink-0 ${meta.cls}`}>
                                        {meta.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <ResultActions />
            </div>
        );
    }

    // Đang chờ /payments/me tải xong để xác định trạng thái thật.
    if (isLoading) {
        return (
            <div className="bg-surface-container rounded-lg shadow-sm p-8 border border-outline-variant text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-on-surface-variant">Đang xác nhận giao dịch...</p>
            </div>
        );
    }

    // Ưu tiên trạng thái thật từ giao dịch; nếu chưa khớp được thì đoán theo
    // query param (PENDING nếu cổng báo thành công nhưng IPN chưa tới).
    const effectiveStatus: PaymentStatus = matched
        ? matched.status
        : successParam
          ? 'PENDING'
          : 'FAILED';

    const isSuccess = effectiveStatus === 'COMPLETED';
    const isPending = effectiveStatus === 'PENDING';

    const Icon = isSuccess ? CheckCircle2 : isPending ? Clock : AlertCircle;
    const iconCls = isSuccess
        ? 'text-green-600 dark:text-green-400'
        : isPending
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400';

    const title = isSuccess
        ? 'Nạp xu thành công!'
        : isPending
          ? 'Giao dịch đang được xử lý'
          : 'Thanh toán không thành công';

    const message = isSuccess
        ? 'Xu đã được cộng vào tài khoản của bạn.'
        : isPending
          ? 'Giao dịch đang chờ xác nhận từ cổng thanh toán. Số dư sẽ được cập nhật trong giây lát — vui lòng tải lại trang sau ít phút.'
          : 'Giao dịch chưa hoàn tất. Bạn chưa bị trừ tiền (nếu có) và có thể thử lại.';

    return (
        <div className="bg-surface-container rounded-lg shadow-sm p-6 md:p-8 border border-outline-variant text-center">
            <Icon className={`w-16 h-16 mx-auto mb-4 ${iconCls}`} />
            <h1 className="text-xl md:text-2xl font-bold text-on-surface mb-2">{title}</h1>
            <p className="text-on-surface-variant text-sm mb-5">{message}</p>

            {matched && (
                <div className="text-left bg-surface rounded-lg border border-outline-variant/60 p-4 mb-5 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-on-surface-variant">Gói</span>
                        <span className="text-on-surface font-medium">
                            {matched.package?.name || `${matched.coinAmount.toLocaleString('vi-VN')} xu`}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-on-surface-variant">Số xu</span>
                        <span className="text-on-surface font-medium">
                            {matched.coinAmount.toLocaleString('vi-VN')} xu
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-on-surface-variant">Số tiền</span>
                        <span className="text-on-surface font-medium">
                            {matched.amount.toLocaleString('vi-VN')} ₫
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-on-surface-variant">Mã giao dịch</span>
                        <span className="text-on-surface font-mono text-xs">{matched.txnRef}</span>
                    </div>
                </div>
            )}

            <ResultActions />
        </div>
    );
}

/** Nút điều hướng dùng chung cho cả hai trạng thái của trang. */
function ResultActions() {
    return (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:opacity-90 text-on-primary rounded-lg font-medium transition-all"
            >
                <Store size={18} /> Về cửa hàng
            </Link>
            <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-variant hover:opacity-90 text-on-surface rounded-lg font-medium transition-all"
            >
                <Home size={18} /> Trang chủ
            </Link>
        </div>
    );
}

export default function PaymentResultPage() {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-xl mx-auto">
                            <Suspense
                                fallback={
                                    <div className="bg-surface-container rounded-lg shadow-sm p-8 border border-outline-variant text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                    </div>
                                }
                            >
                                <PaymentResultInner />
                            </Suspense>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </ProtectedRoute>
    );
}
