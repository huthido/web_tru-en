'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { useAdminWithdrawals, useProcessWithdrawal } from '@/lib/api/hooks/use-wallet';
import type { WithdrawalStatus } from '@/lib/api/wallet.service';

const STATUS_TABS: { key: WithdrawalStatus | 'ALL'; label: string }[] = [
    { key: 'PENDING', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã chuyển' },
    { key: 'REJECTED', label: 'Từ chối' },
    { key: 'ALL', label: 'Tất cả' },
];

const STATUS_CLS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminWithdrawalsPage() {
    const [tab, setTab] = useState<WithdrawalStatus | 'ALL'>('PENDING');
    const { data: rows = [], isLoading } = useAdminWithdrawals(tab === 'ALL' ? undefined : tab);
    const process = useProcessWithdrawal();
    const [busyId, setBusyId] = useState<string | null>(null);

    const act = async (id: string, action: 'APPROVE' | 'REJECT') => {
        let note: string | undefined;
        if (action === 'REJECT') {
            const input = window.prompt('Lý do từ chối (sẽ hoàn xu lại cho tác giả):', '');
            if (input === null) return;
            note = input;
        } else if (!window.confirm('Xác nhận ĐÃ chuyển khoản cho yêu cầu này?')) {
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
        <AdminLayout>
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-on-surface">Yêu cầu rút xu</h1>

                <div className="flex gap-2">
                    {STATUS_TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <Loading />
                ) : (
                    <div className="bg-surface-container rounded-lg shadow-sm overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-container-low">
                                <tr>
                                    {['Tác giả', 'Số xu', 'Ngân hàng', 'Trạng thái', 'Ngày', 'Thao tác'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                                {rows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">Không có yêu cầu nào</td></tr>
                                ) : rows.map((w) => (
                                    <tr key={w.id} className="hover:bg-surface-container-high/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-on-surface">{w.user?.displayName || w.user?.username || '—'}</div>
                                            <div className="text-xs text-on-surface-variant">{w.user?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-on-surface">{w.amount.toLocaleString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-sm text-on-surface-variant">
                                            {w.bankName}<br />
                                            <span className="text-xs text-on-surface-variant">{w.bankAccountNumber} · {w.bankAccountName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CLS[w.status]}`}>{w.status}</span>
                                            {w.note && <div className="text-xs text-red-500 mt-1 max-w-[200px]">{w.note}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-on-surface-variant">{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-4 py-3">
                                            {w.status === 'PENDING' ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => act(w.id, 'APPROVE')} disabled={busyId === w.id}
                                                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50">Duyệt</button>
                                                    <button onClick={() => act(w.id, 'REJECT')} disabled={busyId === w.id}
                                                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50">Từ chối</button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-on-surface-variant">Đã xử lý</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
