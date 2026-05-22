'use client';

import { useState } from 'react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useWalletBalance, useMyWithdrawals, useRequestWithdrawal } from '@/lib/api/hooks/use-wallet';
import { Banknote, Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
    PENDING: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    APPROVED: { label: 'Đã chuyển', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
    REJECTED: { label: 'Từ chối (đã hoàn xu)', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function WithdrawalsPage() {
    const { data: wallet } = useWalletBalance();
    const { data: withdrawals = [], isLoading } = useMyWithdrawals();
    const requestWithdrawal = useRequestWithdrawal();

    const [form, setForm] = useState({ amount: 0, bankName: '', bankAccountNumber: '', bankAccountName: '' });
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    // Withdrawals only debit earnedBalance (see WalletService.debitForWithdrawal).
    // purchasedBalance (xu nạp) is never withdrawable per Apple §3.1.1.
    const withdrawable = wallet?.earnedBalance ?? 0;
    const purchased = wallet?.purchasedBalance ?? 0;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        if (form.amount <= 0 || !form.bankName.trim() || !form.bankAccountNumber.trim() || !form.bankAccountName.trim()) {
            setError('Vui lòng nhập số xu và đầy đủ thông tin ngân hàng.');
            return;
        }
        try {
            await requestWithdrawal.mutateAsync({
                amount: Math.floor(form.amount),
                bankName: form.bankName.trim(),
                bankAccountNumber: form.bankAccountNumber.trim(),
                bankAccountName: form.bankAccountName.trim(),
            });
            setOk(true);
            setForm({ amount: 0, bankName: '', bankAccountNumber: '', bankAccountName: '' });
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.message || 'Không thể tạo yêu cầu rút.');
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-surface-container rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-outline-variant">
                                <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2 flex items-center gap-2">
                                    <Banknote className="w-7 h-7 text-emerald-600" /> Rút xu
                                </h1>
                                <p className="text-on-surface-variant">
                                    Số dư có thể rút:{' '}
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {withdrawable.toLocaleString('vi-VN')} xu
                                    </span>
                                </p>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    Chỉ xu từ doanh thu / ủng hộ mới rút được.
                                    {purchased > 0 && (
                                        <> Xu nạp ({purchased.toLocaleString('vi-VN')}) chỉ dùng để mua nội dung.</>
                                    )}
                                </p>
                            </div>

                            <form onSubmit={submit} className="bg-surface-container rounded-lg shadow-sm p-6 md:p-8 space-y-5 border border-outline-variant mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">Số xu muốn rút</label>
                                    <input
                                        type="number" min={0} step={1}
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: Math.max(0, Math.floor(Number(e.target.value)) || 0) })}
                                        className="w-full md:w-60 px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-emerald-500"
                                        placeholder="VD: 1000"
                                    />
                                    <p className="mt-1 text-xs text-on-surface-variant">Xu sẽ bị tạm giữ ngay khi gửi yêu cầu; nếu admin từ chối sẽ được hoàn lại.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">Ngân hàng</label>
                                        <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-emerald-500" placeholder="VD: Vietcombank" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">Số tài khoản</label>
                                        <input value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-emerald-500" placeholder="Số TK" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">Chủ tài khoản</label>
                                        <input value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-emerald-500" placeholder="NGUYEN VAN A" />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                                        <AlertCircle size={18} /> <span className="text-sm font-medium">{error}</span>
                                    </div>
                                )}
                                {ok && (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 border border-green-200 dark:border-green-800">
                                        <CheckCircle2 size={18} /> <span className="text-sm font-medium">Đã gửi yêu cầu rút. Vui lòng chờ admin duyệt.</span>
                                    </div>
                                )}

                                <button type="submit" disabled={requestWithdrawal.isPending}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                    {requestWithdrawal.isPending ? (<><Loader2 size={18} className="animate-spin" /> Đang gửi...</>) : 'Gửi yêu cầu rút'}
                                </button>
                            </form>

                            <div className="bg-surface-container rounded-lg shadow-sm p-6 border border-outline-variant">
                                <h2 className="font-bold text-on-surface mb-4">Lịch sử yêu cầu rút</h2>
                                {isLoading ? (
                                    <p className="text-sm text-on-surface-variant">Đang tải...</p>
                                ) : withdrawals.length === 0 ? (
                                    <p className="text-sm text-on-surface-variant">Chưa có yêu cầu rút nào.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {withdrawals.map((w) => {
                                            const meta = STATUS_META[w.status] || STATUS_META.PENDING;
                                            const Icon = meta.icon;
                                            return (
                                                <div key={w.id} className="flex items-start justify-between gap-3 border border-outline-variant rounded-lg p-3">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-on-surface">{w.amount.toLocaleString('vi-VN')} xu</p>
                                                        <p className="text-xs text-on-surface-variant truncate">
                                                            {w.bankName} · {w.bankAccountNumber} · {w.bankAccountName}
                                                        </p>
                                                        <p className="text-xs text-on-surface-variant">
                                                            {new Date(w.createdAt).toLocaleString('vi-VN')}
                                                        </p>
                                                        {w.note && <p className="text-xs text-red-500 mt-1">Ghi chú: {w.note}</p>}
                                                    </div>
                                                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls}`}>
                                                        <Icon size={13} /> {meta.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
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
