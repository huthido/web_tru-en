'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { WalletService, AdminWalletInfo } from '@/lib/api/wallet.service';
import { Lock, Unlock, Search, Loader2, AlertCircle } from 'lucide-react';

export default function AdminWalletsPage() {
    const [query, setQuery] = useState('');
    const [info, setInfo] = useState<AdminWalletInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lookup = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError(null);
        setInfo(null);
        if (!query.trim()) return;
        setLoading(true);
        try {
            setInfo(await WalletService.adminGetWallet(query.trim()));
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.message || 'Không tìm thấy');
        } finally {
            setLoading(false);
        }
    };

    const toggleLock = async () => {
        if (!info) return;
        setBusy(true);
        setError(null);
        try {
            const res = await WalletService.adminSetWalletLock(info.user.id, !info.isLocked);
            setInfo(res);
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.message || 'Lỗi xử lý');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Khóa ví / Chống gian lận</h1>

                <form onSubmit={lookup} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Username hoặc email người dùng"
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button type="submit" disabled={loading}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Tra cứu'}
                    </button>
                </form>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                        <AlertCircle size={18} /> <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {info && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {info.user.displayName || info.user.username}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">@{info.user.username} · {info.user.email}</p>
                                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                    Số dư: <b>{info.balance.toLocaleString('vi-VN')} xu</b>
                                </p>
                                <p className="mt-1 text-sm">
                                    Trạng thái ví:{' '}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.isLocked
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                                        {info.isLocked ? 'ĐANG KHÓA' : 'Bình thường'}
                                    </span>
                                </p>
                            </div>
                            <button onClick={toggleLock} disabled={busy}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 ${info.isLocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {busy ? <Loader2 size={16} className="animate-spin" /> : info.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                                {info.isLocked ? 'Mở khóa ví' : 'Khóa ví'}
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                            Ví bị khóa: người dùng không thể mua chương/truyện, ủng hộ, chuyển xu hoặc rút xu. Số dư vẫn giữ nguyên.
                        </p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
