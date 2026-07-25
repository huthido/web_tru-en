'use client';

import { useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
    useCoinPackages,
    useCreateCoinPackage,
    useUpdateCoinPackage,
    useDeleteCoinPackage
} from '@/lib/api/hooks/use-coin-packages';
import { CoinPackage, CreateCoinPackageDto } from '@/types/coin-package';
import { CoinPackageModal } from '@/components/admin/coin-packages/CoinPackageModal';

export default function AdminCoinPackagesPage() {
    const [includeInactive, setIncludeInactive] = useState(true);
    const [editingPackage, setEditingPackage] = useState<CoinPackage | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Queries & Mutations
    const { data: packages, isLoading } = useCoinPackages(includeInactive);
    const createMutation = useCreateCoinPackage();
    const updateMutation = useUpdateCoinPackage();
    const deleteMutation = useDeleteCoinPackage();

    const handleCreate = async (data: CreateCoinPackageDto) => {
        await createMutation.mutateAsync(data);
        setShowModal(false);
    };

    const handleUpdate = async (data: CreateCoinPackageDto) => {
        if (editingPackage) {
            await updateMutation.mutateAsync({
                id: editingPackage.id,
                data
            });
            setShowModal(false);
            setEditingPackage(null);
        }
    };

    const handleDelete = async () => {
        if (deletingId) {
            await deleteMutation.mutateAsync(deletingId);
            setDeletingId(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                            Quản lý Gói Xu
                        </h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">
                            Thiết lập các gói xu để người dùng nạp tiền
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <RefreshButton queryKeys={[['coin-packages']]} />
                        <button
                            onClick={() => {
                                setEditingPackage(null);
                                setShowModal(true);
                            }}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Thêm gói mới
                        </button>
                    </div>
                </div>

                <div className="bg-surface-container rounded-lg shadow-sm overflow-hidden text-black dark:text-white">
                    <div className="p-4 border-b border-outline-variant flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    checked={includeInactive}
                                    onChange={(e) => setIncludeInactive(e.target.checked)}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                                <span className="text-on-surface-variant">
                                    Hiển thị gói ẩn
                                </span>
                            </label>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loading />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-container-low">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Tên gói
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Số Xu
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Giá tiền (VNĐ)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface-container divide-y divide-outline-variant">
                                    {packages && packages.length > 0 ? (
                                        packages.map((pkg) => (
                                            <tr key={pkg.id} className="hover:bg-surface-container-high">
                                                <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                    {pkg.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-bold text-yellow-600 dark:text-yellow-400">
                                                    {pkg.coinAmount.toLocaleString()} Xu
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600 dark:text-green-400">
                                                    {formatCurrency(pkg.priceVND)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${pkg.isActive
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-surface-container-high text-on-surface'
                                                        }`}>
                                                        {pkg.isActive ? 'Hoạt động' : 'Đã ẩn'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingPackage(pkg);
                                                                setShowModal(true);
                                                            }}
                                                            className="text-primary hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(pkg.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                            title="Xóa"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                                                Chưa có gói xu nào.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <CoinPackageModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingPackage(null);
                }}
                onSubmit={editingPackage ? handleUpdate : handleCreate}
                initialData={editingPackage}
                isLoading={editingPackage ? updateMutation.isPending : createMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDelete}
                title="Xóa gói xu"
                message="Bạn có chắc chắn muốn xóa gói xu này không? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                confirmColor="red"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
