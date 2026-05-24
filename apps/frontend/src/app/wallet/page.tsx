'use client';

import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useWalletBalance, useTransactionHistory } from '@/lib/api/hooks/use-wallet';
import { TransactionRow } from '@/components/wallet/transaction-row';
import { Coins, ShoppingCart, ArrowUpCircle, History, Loader2, Wallet } from 'lucide-react';

export default function WalletPage() {
    const { data: wallet, isLoading: balanceLoading } = useWalletBalance();
    const { data: history, isLoading: historyLoading } = useTransactionHistory({ limit: 10 });

    const purchased = wallet?.purchasedBalance ?? 0;
    const earned = wallet?.earnedBalance ?? 0;
    const total = purchased + earned;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Header */}
                            <div className="bg-surface-container rounded-lg p-6 md:p-8 shadow-sm border border-outline-variant">
                                <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1 flex items-center gap-2">
                                    <Wallet className="w-7 h-7 text-primary" /> Ví xu
                                </h1>
                                <p className="text-on-surface-variant text-sm">
                                    Quản lý xu, theo dõi nạp/rút và lịch sử giao dịch.
                                </p>
                            </div>

                            {/* Balance card */}
                            <div className="bg-surface-container rounded-lg p-6 shadow-sm border border-outline-variant">
                                {balanceLoading ? (
                                    <div className="flex items-center gap-2 text-on-surface-variant">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải số dư...
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
                                                <Coins className="w-6 h-6 text-on-primary-container" />
                                            </span>
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Tổng số dư</p>
                                                <p className="text-3xl font-extrabold text-on-surface">
                                                    {total.toLocaleString('vi-VN')}{' '}
                                                    <span className="text-base font-semibold text-on-surface-variant">xu</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="rounded-lg bg-surface-container-high p-3">
                                                <p className="text-xs text-on-surface-variant mb-1">Xu đã nạp</p>
                                                <p className="font-semibold text-on-surface">
                                                    {purchased.toLocaleString('vi-VN')}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                                                    Dùng mua nội dung, không rút được
                                                </p>
                                            </div>
                                            <div className="rounded-lg bg-surface-container-high p-3">
                                                <p className="text-xs text-on-surface-variant mb-1">Xu kiếm được</p>
                                                <p className="font-semibold text-on-surface">
                                                    {earned.toLocaleString('vi-VN')}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                                                    Rút về tiền VND được
                                                </p>
                                            </div>
                                        </div>
                                        {wallet?.isLocked && (
                                            <p className="mt-3 text-sm text-rose-600 dark:text-rose-400 font-medium">
                                                ⚠️ Ví đang bị khoá — không thể chi tiêu, rút hoặc chuyển xu.
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Quick actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Link
                                    href="/shop"
                                    className="flex items-center gap-3 p-4 bg-surface-container rounded-lg shadow-sm border border-outline-variant hover:bg-surface-container-high transition-colors"
                                >
                                    <span className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-on-primary-container" />
                                    </span>
                                    <div>
                                        <p className="font-medium text-on-surface">Nạp xu</p>
                                        <p className="text-xs text-on-surface-variant">Mua gói xu qua VNPay</p>
                                    </div>
                                </Link>
                                <Link
                                    href="/author/withdrawals"
                                    className="flex items-center gap-3 p-4 bg-surface-container rounded-lg shadow-sm border border-outline-variant hover:bg-surface-container-high transition-colors"
                                >
                                    <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                                        <ArrowUpCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    </span>
                                    <div>
                                        <p className="font-medium text-on-surface">Rút xu</p>
                                        <p className="text-xs text-on-surface-variant">Chuyển sang tiền VND</p>
                                    </div>
                                </Link>
                                <Link
                                    href="/wallet/transactions"
                                    className="flex items-center gap-3 p-4 bg-surface-container rounded-lg shadow-sm border border-outline-variant hover:bg-surface-container-high transition-colors"
                                >
                                    <span className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                                        <History className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                    </span>
                                    <div>
                                        <p className="font-medium text-on-surface">Lịch sử</p>
                                        <p className="text-xs text-on-surface-variant">Xem tất cả giao dịch</p>
                                    </div>
                                </Link>
                            </div>

                            {/* Recent transactions widget */}
                            <div className="bg-surface-container rounded-lg p-4 md:p-6 shadow-sm border border-outline-variant">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-bold text-on-surface">Giao dịch gần đây</h2>
                                    <Link
                                        href="/wallet/transactions"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        Xem tất cả →
                                    </Link>
                                </div>
                                {historyLoading ? (
                                    <div className="flex items-center gap-2 py-6 text-on-surface-variant">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                    </div>
                                ) : !history || history.items.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-on-surface-variant">
                                        Chưa có giao dịch nào.
                                    </p>
                                ) : (
                                    <div>
                                        {history.items.map((tx) => (
                                            <TransactionRow key={tx.id} tx={tx} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </ProtectedRoute>
    );
}
