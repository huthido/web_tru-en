'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { WalletService, AdminWalletInfo } from '@/lib/api/wallet.service';
import { Lock, Unlock, Search, Loader2, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';

export default function AdminWalletsPage() {
    const [query, setQuery] = useState('');
    const [info, setInfo] = useState<AdminWalletInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [adjustBucket, setAdjustBucket] = useState<'PURCHASED' | 'EARNED'>('EARNED');
    const [adjustDelta, setAdjustDelta] = useState<number>(0);
    const [adjustNote, setAdjustNote] = useState('');
    const [adjustBusy, setAdjustBusy] = useState(false);
    const [adjustOk, setAdjustOk] = useState<string | null>(null);

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

    const submitAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!info) return;
        setError(null);
        setAdjustOk(null);
        if (!Number.isInteger(adjustDelta) || adjustDelta === 0) {
            setError('Delta phải là số nguyên khác 0');
            return;
        }
        if (!adjustNote.trim()) {
            setError('Vui lòng nhập lý do');
            return;
        }
        const confirmMsg = `Xác nhận ${adjustDelta > 0 ? 'CỘNG' : 'TRỪ'} ${Math.abs(adjustDelta).toLocaleString('vi-VN')} ${adjustBucket === 'PURCHASED' ? 'xu nạp' : 'xu doanh thu'} cho ${info.user.displayName || info.user.username}?`;
        if (!window.confirm(confirmMsg)) return;

        setAdjustBusy(true);
        try {
            const res = await WalletService.adminAdjustWallet(info.user.id, {
                bucket: adjustBucket,
                delta: adjustDelta,
                note: adjustNote.trim(),
            });
            setInfo(res);
            setAdjustOk(`Đã ${adjustDelta > 0 ? 'cộng' : 'trừ'} ${Math.abs(adjustDelta).toLocaleString('vi-VN')} xu thành công.`);
            setAdjustDelta(0);
            setAdjustNote('');
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.message || 'Lỗi điều chỉnh ví');
        } finally {
            setAdjustBusy(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-4 max-w-2xl">
                <h1 className="text-2xl font-bold text-on-surface">Khóa ví / Chống gian lận</h1>

                <form onSubmit={lookup} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Username hoặc email người dùng"
                            className="w-full pl-10 pr-3 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary"
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
                    <div className="bg-surface-container rounded-lg shadow-sm p-6 border border-outline-variant">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-on-surface">
                                    {info.user.displayName || info.user.username}
                                </p>
                                <p className="text-sm text-on-surface-variant">@{info.user.username} · {info.user.email}</p>
                                <div className="mt-3 text-sm text-on-surface-variant space-y-0.5">
                                    <p>Xu đã nạp (không rút được): <b>{info.purchasedBalance.toLocaleString('vi-VN')} xu</b></p>
                                    <p>Xu doanh thu (rút được): <b className="text-emerald-600 dark:text-emerald-400">{info.earnedBalance.toLocaleString('vi-VN')} xu</b></p>
                                    <p className="text-on-surface-variant">Tổng: <b>{info.balance.toLocaleString('vi-VN')} xu</b></p>
                                </div>
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
                        <p className="mt-4 text-xs text-on-surface-variant">
                            Ví bị khóa: người dùng không thể mua chương/truyện, ủng hộ, chuyển xu hoặc rút xu. Số dư vẫn giữ nguyên.
                        </p>
                    </div>
                )}

                {info && (
                    <form onSubmit={submitAdjust} className="bg-surface-container rounded-lg shadow-sm p-6 border border-outline-variant space-y-4">
                        <h2 className="font-bold text-on-surface flex items-center gap-2">
                            <Sliders size={18} /> Điều chỉnh ví thủ công
                        </h2>
                        <p className="text-xs text-on-surface-variant">
                            Cộng/trừ trực tiếp một bucket. Dùng cho support compensation, fraud cleanup, hoặc fix tác giả có doanh thu cũ đã bị backfill vào xu nạp. Mỗi thao tác ghi audit log.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Bucket</label>
                                <select value={adjustBucket} onChange={(e) => setAdjustBucket(e.target.value as 'PURCHASED' | 'EARNED')}
                                    className="w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary">
                                    <option value="EARNED">Xu doanh thu (rút được)</option>
                                    <option value="PURCHASED">Xu nạp (chi tiêu được)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Delta (âm = trừ)</label>
                                <input type="number" step={1} value={adjustDelta}
                                    onChange={(e) => setAdjustDelta(Math.trunc(Number(e.target.value) || 0))}
                                    className="w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary"
                                    placeholder="VD: 1000 hoặc -500" />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                                <button type="submit" disabled={adjustBusy}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                                    {adjustBusy ? <Loader2 size={16} className="animate-spin" /> : 'Áp dụng'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">Lý do (bắt buộc, audit log)</label>
                            <textarea value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} rows={2} maxLength={500}
                                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary"
                                placeholder="VD: Hoàn xu doanh thu bị backfill nhầm vào xu nạp khi migrate wallet split (ticket #1234)" />
                        </div>
                        {adjustOk && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 border border-green-200 dark:border-green-800">
                                <CheckCircle2 size={18} /> <span className="text-sm font-medium">{adjustOk}</span>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
