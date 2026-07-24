'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { useAdminManualPayments, useProcessManualPayment } from '@/lib/api/hooks/use-payments';

const STATUS_TABS: { key: string; label: string }[] = [
    { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'COMPLETED', label: 'Đã cộng xu' },
    { key: 'CANCELLED', label: 'Đã huỷ' },
    { key: 'ALL', label: 'Tất cả' },
];

const STATUS_CLS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    REFUNDED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function AdminManualPaymentsPage() {
    const [tab, setTab] = useState<string>('PENDING');
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    // Debounce ô tìm để không gọi API mỗi lần gõ.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    // Khi đang tìm theo mã, bỏ lọc trạng thái để luôn tìm thấy đơn dù ở bất kỳ
    // trạng thái nào (đã duyệt / đã huỷ / chờ).
    const searching = debounced.length > 0;
    const { data: rows = [], isLoading } = useAdminManualPayments(
        searching ? undefined : tab === 'ALL' ? undefined : tab,
        debounced,
    );
    const process = useProcessManualPayment();
    const [busyId, setBusyId] = useState<string | null>(null);

    const act = async (id: string, action: 'CONFIRM' | 'REJECT') => {
        let note: string | undefined;
        if (action === 'REJECT') {
            const input = window.prompt('Lý do từ chối (gửi tới người dùng):', '');
            if (input === null) return;
            note = input;
        } else if (
            !window.confirm('Xác nhận ĐÃ NHẬN được tiền chuyển khoản? Xu sẽ được cộng ngay cho người dùng.')
        ) {
            return;
        }
        setBusyId(id);
        try {
            await process.mutateAsync({ id, action, note });
        } catch (e: any) {
            alert(e?.response?.data?.error || e?.response?.data?.message || 'Lỗi xử lý');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-on-surface">Duyệt nạp thủ công</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                    Yêu cầu nạp xu qua chuyển khoản ngân hàng. Đối chiếu số tiền + mã tham chiếu (nội dung CK)
                    với sao kê ngân hàng rồi bấm <strong>Xác nhận</strong> để cộng xu.
                </p>
            </div>

            {/* Ô tìm theo mã tham chiếu / tên / email — đối soát với sao kê NH */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo mã CK (VD: NAP1A2B3C4D), tên hoặc email…"
                    className="w-full pl-9 pr-9 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Xoá tìm kiếm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-container-high text-on-surface-variant"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className={`flex flex-wrap gap-2 ${searching ? 'opacity-40 pointer-events-none' : ''}`}>
                {STATUS_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            tab === t.key
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {searching && (
                <p className="text-xs text-on-surface-variant">
                    Đang tìm &quot;<span className="font-mono">{debounced}</span>&quot; trên mọi trạng thái —
                    {rows.length} kết quả.
                </p>
            )}

            {isLoading ? (
                <Loading />
            ) : (
                <div className="bg-surface-container rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface-container-low">
                            <tr>
                                {['Người dùng', 'Gói / Xu', 'Số tiền', 'Mã CK', 'Trạng thái', 'Ngày', 'Thao tác'].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                                        Không có yêu cầu nào
                                    </td>
                                </tr>
                            ) : (
                                rows.map((p) => {
                                    const reason = p.providerData?.reason as string | undefined;
                                    // User đã bấm "Tôi đã chuyển khoản" → cần đối soát gấp.
                                    const claimedAt = p.providerData?.userClaimedPaidAt as string | undefined;
                                    const claimCount = Number(p.providerData?.userClaimCount) || 0;
                                    return (
                                        <tr
                                            key={p.id}
                                            className={`hover:bg-surface-container-high/50 ${claimedAt && p.status === 'PENDING'
                                                ? 'bg-amber-50/60 dark:bg-amber-900/10'
                                                : ''
                                                }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-on-surface">
                                                    {p.user?.displayName || p.user?.username || '—'}
                                                </div>
                                                <div className="text-xs text-on-surface-variant">{p.user?.email}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-on-surface">
                                                {p.package?.name || '—'}
                                                <br />
                                                <span className="text-xs text-on-surface-variant">
                                                    {p.coinAmount.toLocaleString('vi-VN')} xu
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-on-surface whitespace-nowrap">
                                                {p.amount.toLocaleString('vi-VN')} ₫
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm text-on-surface">{p.txnRef}</span>
                                                {claimedAt && p.status === 'PENDING' && (
                                                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                        🔔 User báo đã CK
                                                        {claimCount > 1 && ` (${claimCount}×)`}
                                                    </div>
                                                )}
                                                {claimedAt && (
                                                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                                                        {new Date(claimedAt).toLocaleString('vi-VN')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                                        STATUS_CLS[p.status] || ''
                                                    }`}
                                                >
                                                    {p.status}
                                                </span>
                                                {reason && (
                                                    <div className="text-xs text-red-500 mt-1 max-w-[200px]">{reason}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-on-surface-variant whitespace-nowrap">
                                                {new Date(p.createdAt).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.status === 'PENDING' ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => act(p.id, 'CONFIRM')}
                                                            disabled={busyId === p.id}
                                                            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                                                        >
                                                            Xác nhận
                                                        </button>
                                                        <button
                                                            onClick={() => act(p.id, 'REJECT')}
                                                            disabled={busyId === p.id}
                                                            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-on-surface-variant">Đã xử lý</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
