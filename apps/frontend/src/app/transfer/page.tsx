'use client';

import { useState } from 'react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useWalletBalance, useTransferCoins } from '@/lib/api/hooks/use-wallet';
import { ArrowLeftRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TransferPage() {
    const { data: wallet } = useWalletBalance();
    const transfer = useTransferCoins();
    const [form, setForm] = useState({ recipient: '', amount: 0, message: '' });
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const balance = wallet?.balance ?? 0;
    const insufficient = form.amount > 0 && form.amount > balance;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setDone(null);
        if (!form.recipient.trim() || form.amount <= 0) {
            setError('Nhập người nhận và số xu hợp lệ.');
            return;
        }
        try {
            const res: any = await transfer.mutateAsync({
                recipient: form.recipient.trim(),
                amount: Math.floor(form.amount),
                message: form.message.trim() || undefined,
            });
            const name = res?.recipient?.displayName || res?.recipient?.username || 'người nhận';
            setDone(`Đã chuyển ${Math.floor(form.amount).toLocaleString('vi-VN')} xu cho ${name}.`);
            setForm({ recipient: '', amount: 0, message: '' });
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.message || 'Không thể chuyển xu.');
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-[120px] pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-xl mx-auto">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <ArrowLeftRight className="w-7 h-7 text-indigo-600" /> Chuyển xu
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Số dư:{' '}
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {balance.toLocaleString('vi-VN')} xu
                                    </span>
                                </p>
                            </div>

                            <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8 space-y-5 border border-gray-200 dark:border-gray-700">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Người nhận (username hoặc email)</label>
                                    <input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" placeholder="vd: nguyenvana hoặc a@email.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Số xu</label>
                                    <input type="number" min={0} step={1} value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: Math.max(0, Math.floor(Number(e.target.value)) || 0) })}
                                        className="w-full md:w-48 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lời nhắn (tùy chọn)</label>
                                    <input value={form.message} maxLength={200} onChange={(e) => setForm({ ...form, message: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" placeholder="Lời nhắn ngắn" />
                                </div>

                                {insufficient && (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                                        <AlertCircle size={18} /> <span className="text-sm font-medium">Số dư không đủ.</span>
                                    </div>
                                )}
                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                                        <AlertCircle size={18} /> <span className="text-sm font-medium">{error}</span>
                                    </div>
                                )}
                                {done && (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 border border-green-200 dark:border-green-800">
                                        <CheckCircle2 size={18} /> <span className="text-sm font-medium">{done}</span>
                                    </div>
                                )}

                                <button type="submit" disabled={transfer.isPending || insufficient}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                    {transfer.isPending ? (<><Loader2 size={18} className="animate-spin" /> Đang chuyển...</>) : 'Chuyển xu'}
                                </button>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Chuyển xu không mất phí. Tính năng có thể bị admin tắt.
                                </p>
                            </form>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </ProtectedRoute>
    );
}
