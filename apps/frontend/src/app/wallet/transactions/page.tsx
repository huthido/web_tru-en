'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useTransactionHistory } from '@/lib/api/hooks/use-wallet';
import { TransactionRow, TRANSACTION_TYPE_OPTIONS } from '@/components/wallet/transaction-row';
import type { TransactionType } from '@/lib/api/wallet.service';
import { History, Loader2, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
    const [page, setPage] = useState(1);
    const [types, setTypes] = useState<TransactionType[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const queryParams = useMemo(
        () => ({
            page,
            limit: PAGE_SIZE,
            types: types.length > 0 ? types : undefined,
            // Convert YYYY-MM-DD input → ISO 8601 (00:00:00 start, 23:59:59 end)
            startDate: startDate ? new Date(startDate + 'T00:00:00').toISOString() : undefined,
            endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        }),
        [page, types, startDate, endDate],
    );

    const { data, isLoading, isFetching } = useTransactionHistory(queryParams);

    const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

    const toggleType = (t: TransactionType) => {
        setPage(1);
        setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    };

    const clearFilters = () => {
        setPage(1);
        setTypes([]);
        setStartDate('');
        setEndDate('');
    };

    const hasFilters = types.length > 0 || startDate || endDate;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-on-surface flex items-center gap-2">
                                        <History className="w-7 h-7 text-primary" /> Lịch sử giao dịch
                                    </h1>
                                    <p className="text-on-surface-variant text-sm mt-1">
                                        Toàn bộ giao dịch xu trên tài khoản của bạn.
                                    </p>
                                </div>
                                <Link
                                    href="/wallet"
                                    className="text-sm text-on-surface-variant hover:text-primary"
                                >
                                    ← Về Ví xu
                                </Link>
                            </div>

                            {/* Filter panel */}
                            <div className="bg-surface-container rounded-lg p-4 md:p-5 shadow-sm border border-outline-variant space-y-4">
                                <div className="flex items-center gap-2 text-on-surface font-medium">
                                    <Filter className="w-4 h-4" /> Bộ lọc
                                    {hasFilters && (
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="ml-auto inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary"
                                        >
                                            <X className="w-3 h-3" /> Xoá bộ lọc
                                        </button>
                                    )}
                                </div>

                                {/* Type filter chips */}
                                <div>
                                    <p className="text-xs text-on-surface-variant mb-2">Loại giao dịch</p>
                                    <div className="flex flex-wrap gap-2">
                                        {TRANSACTION_TYPE_OPTIONS.map((opt) => {
                                            const active = types.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => toggleType(opt.value)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                                        active
                                                            ? 'bg-primary text-on-primary border-primary'
                                                            : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:bg-surface-container-highest'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Date range */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-on-surface-variant mb-1">Từ ngày</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => {
                                                setPage(1);
                                                setStartDate(e.target.value);
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-on-surface-variant mb-1">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => {
                                                setPage(1);
                                                setEndDate(e.target.value);
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-high text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* List */}
                            <div className="bg-surface-container rounded-lg p-4 md:p-6 shadow-sm border border-outline-variant">
                                {isLoading ? (
                                    <div className="flex items-center gap-2 py-12 justify-center text-on-surface-variant">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Đang tải...
                                    </div>
                                ) : !data || data.items.length === 0 ? (
                                    <p className="py-12 text-center text-sm text-on-surface-variant">
                                        Không có giao dịch nào khớp bộ lọc.
                                    </p>
                                ) : (
                                    <>
                                        <div>
                                            {data.items.map((tx) => (
                                                <TransactionRow key={tx.id} tx={tx} />
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant text-sm text-on-surface-variant">
                                            <div>
                                                Hiển thị {(data.page - 1) * data.limit + 1}–
                                                {Math.min(data.page * data.limit, data.total)} trong{' '}
                                                <span className="font-medium text-on-surface">
                                                    {data.total.toLocaleString('vi-VN')}
                                                </span>{' '}
                                                giao dịch
                                                {isFetching && (
                                                    <Loader2 className="inline-block ml-2 w-3 h-3 animate-spin" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                    disabled={page <= 1}
                                                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-highest transition-colors"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <span className="text-on-surface font-medium px-2">
                                                    {data.page}/{totalPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                                    disabled={page >= totalPages}
                                                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-highest transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </>
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
