'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { useAds, useCreateAd, useUpdateAd, useDeleteAd } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition, Ad } from '@/lib/api/ads.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast, ToastContainer } from '@/components/ui/toast';
import * as XLSX from 'xlsx';

export default function AdminAdsPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<AdType | ''>('');
    const [positionFilter, setPositionFilter] = useState<AdPosition | ''>('');
    const [isActiveFilter, setIsActiveFilter] = useState<boolean | ''>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAd, setEditingAd] = useState<Ad | null>(null);
    const [viewingAd, setViewingAd] = useState<Ad | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [deletingAd, setDeletingAd] = useState<Ad | null>(null);
    const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
    const [showBulkActionModal, setShowBulkActionModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const { data, isLoading } = useAds({
        type: typeFilter || undefined,
        position: positionFilter || undefined,
        isActive: isActiveFilter !== '' ? isActiveFilter : undefined,
        search: searchTerm || undefined,
        page,
        limit,
    });

    const createMutation = useCreateAd();
    const updateMutation = useUpdateAd();
    const deleteMutation = useDeleteAd();
    const { toasts, showToast, removeToast } = useToast();

    const ads = data?.data || [];
    const meta = data?.meta;

    const handleDelete = async () => {
        if (deletingAd) {
            try {
                await deleteMutation.mutateAsync(deletingAd.id);
                setDeletingAd(null);
                showToast('Đã xóa quảng cáo thành công', 'success');
            } catch (error) {
                showToast('Có lỗi xảy ra khi xóa quảng cáo', 'error');
            }
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedAds.size === 0) return;

        try {
            if (bulkAction === 'delete') {
                const promises = Array.from(selectedAds).map((adId) =>
                    deleteMutation.mutateAsync(adId)
                );
                await Promise.all(promises);
                showToast(`Đã xóa ${selectedAds.size} quảng cáo thành công`, 'success');
            } else {
                const promises = Array.from(selectedAds).map((adId) =>
                    updateMutation.mutateAsync({
                        id: adId,
                        data: { isActive: bulkAction === 'activate' },
                    })
                );
                await Promise.all(promises);
                const actionText = bulkAction === 'activate' ? 'kích hoạt' : 'tắt';
                showToast(`Đã ${actionText} ${selectedAds.size} quảng cáo thành công`, 'success');
            }

            setSelectedAds(new Set());
            setShowBulkActionModal(false);
            setBulkAction(null);
        } catch (error) {
            showToast('Có lỗi xảy ra khi thực hiện thao tác', 'error');
        }
    };

    const handleToggleActive = async (ad: Ad) => {
        try {
            await updateMutation.mutateAsync({
                id: ad.id,
                data: { isActive: !ad.isActive },
            });
            showToast(ad.isActive ? 'Đã tắt quảng cáo' : 'Đã kích hoạt quảng cáo', 'success');
        } catch (error) {
            showToast('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
        }
    };

    const handleExportExcel = () => {
        const exportData = ads.map((ad) => ({
            'ID': ad.id,
            'Tiêu đề': ad.title || '',
            'Mô tả': ad.description || '',
            'URL ảnh': ad.imageUrl,
            'Link quảng cáo': ad.linkUrl || '',
            'Loại': ad.type,
            'Vị trí': ad.position,
            'Số chương cần đọc': ad.type === AdType.POPUP && ad.popupInterval ? ad.popupInterval : '',
            'Trạng thái': ad.isActive ? 'Hoạt động' : 'Tắt',
            'Ngày bắt đầu': ad.startDate ? new Date(ad.startDate).toLocaleDateString('vi-VN') : '',
            'Ngày kết thúc': ad.endDate ? new Date(ad.endDate).toLocaleDateString('vi-VN') : '',
            'Lượt xem': ad.viewCount,
            'Lượt click': ad.clickCount,
            'CTR (%)': ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(2) : '0.00',
            'Người tạo': ad.createdBy?.displayName || ad.createdBy?.username || '',
            'Ngày tạo': new Date(ad.createdAt).toLocaleDateString('vi-VN'),
            'Ngày cập nhật': new Date(ad.updatedAt).toLocaleDateString('vi-VN'),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Quảng cáo');

        // Auto-size columns
        const colWidths = [
            { wch: 30 }, // ID
            { wch: 25 }, // Title
            { wch: 40 }, // Description
            { wch: 40 }, // Image URL
            { wch: 40 }, // Link URL
            { wch: 12 }, // Type
            { wch: 15 }, // Position
            { wch: 12 }, // Status
            { wch: 15 }, // Start Date
            { wch: 15 }, // End Date
            { wch: 10 }, // View Count
            { wch: 10 }, // Click Count
            { wch: 10 }, // CTR
            { wch: 20 }, // Creator
            { wch: 15 }, // Created
            { wch: 15 }, // Updated
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `ads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleSelectAd = (adId: string) => {
        const newSelected = new Set(selectedAds);
        if (newSelected.has(adId)) {
            newSelected.delete(adId);
        } else {
            newSelected.add(adId);
        }
        setSelectedAds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedAds.size === ads.length) {
            setSelectedAds(new Set());
        } else {
            setSelectedAds(new Set(ads.map((a) => a.id)));
        }
    };

    const totalPages = meta?.totalPages || 1;
    const pageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 3) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    }, [page, totalPages]);

    const getAdStatus = (ad: Ad) => {
        const now = new Date();
        const isScheduled = ad.startDate || ad.endDate;
        const isInSchedule =
            (!ad.startDate || new Date(ad.startDate) <= now) &&
            (!ad.endDate || new Date(ad.endDate) >= now);
        return ad.isActive && isInSchedule ? 'Hoạt động' : 'Tắt';
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Quản lý Quảng cáo</h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">Quản lý và theo dõi quảng cáo trên hệ thống</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <RefreshButton queryKeys={[['ads']]} />
                        {selectedAds.size > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setBulkAction('activate');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Kích hoạt ({selectedAds.size})
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction('deactivate');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Tắt ({selectedAds.size})
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction('delete');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Xóa ({selectedAds.size})
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                            className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2"
                        >
                            {viewMode === 'table' ? (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7" />
                                        <rect x="14" y="3" width="7" height="7" />
                                        <rect x="14" y="14" width="7" height="7" />
                                        <rect x="3" y="14" width="7" height="7" />
                                    </svg>
                                    Lưới
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 3h18v18H3zM3 9h18M9 3v18" />
                                    </svg>
                                    Bảng
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Xuất Excel
                        </button>
                        <button
                            onClick={() => {
                                setEditingAd(null);
                                setShowCreateModal(true);
                            }}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
                        >
                            + Tạo quảng cáo mới
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-surface-container rounded-lg p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Tìm kiếm
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Tìm theo tiêu đề..."
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Loại
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value as AdType | '');
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value={AdType.POPUP}>Popup</option>
                                <option value={AdType.BANNER}>Banner</option>
                                <option value={AdType.SIDEBAR}>Sidebar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Vị trí
                            </label>
                            <select
                                value={positionFilter}
                                onChange={(e) => {
                                    setPositionFilter(e.target.value as AdPosition | '');
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value={AdPosition.BOTTOM}>Bottom</option>
                                <option value={AdPosition.SIDEBAR_LEFT}>Sidebar Left</option>
                                <option value={AdPosition.INLINE}>Inline</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={isActiveFilter === '' ? '' : String(isActiveFilter)}
                                onChange={(e) => {
                                    setIsActiveFilter(e.target.value === '' ? '' : e.target.value === 'true');
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value="true">Đang hoạt động</option>
                                <option value="false">Đã tắt</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Số lượng / trang
                            </label>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Ads List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loading />
                    </div>
                ) : viewMode === 'table' ? (
                    <>
                        <div className="bg-surface-container rounded-lg shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-surface-container-low">
                                        <tr>
                                            <th className="px-6 py-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAds.size === ads.length && ads.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                                Quảng cáo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                                Loại / Vị trí
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                                Thống kê
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                                Trạng thái
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                                Ngày tạo
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                                Thao tác
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface-container divide-y divide-outline-variant">
                                        {ads.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant">
                                                    Không có quảng cáo nào
                                                </td>
                                            </tr>
                                        ) : (
                                            ads.map((ad) => (
                                                <tr key={ad.id} className="hover:bg-surface-container-high">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAds.has(ad.id)}
                                                            onChange={() => toggleSelectAd(ad.id)}
                                                            className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative w-16 h-16 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                                                                {ad.imageUrl ? (
                                                                    <Image
                                                                        src={ad.imageUrl}
                                                                        alt={ad.title || 'Quảng cáo'}
                                                                        fill
                                                                        className="object-contain"
                                                                        sizes="64px"
                                                                        unoptimized={ad.imageUrl.includes('cache.staticscdn.net')}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">
                                                                        No Image
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-medium text-on-surface truncate">
                                                                    {ad.title || 'Không có tiêu đề'}
                                                                </div>
                                                                {ad.description && (
                                                                    <div className="text-sm text-on-surface-variant truncate">
                                                                        {ad.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${ad.type === AdType.POPUP
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                                : ad.type === AdType.BANNER
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                    : 'bg-surface-container-high text-on-surface'
                                                                }`}>
                                                                {ad.type}
                                                            </span>
                                                            <div className="text-xs text-on-surface-variant">
                                                                {ad.position}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                                                        <div className="space-y-1">
                                                            <div>Xem: {ad.viewCount.toLocaleString()}</div>
                                                            <div>Click: {ad.clickCount.toLocaleString()}</div>
                                                            <div className="text-xs">
                                                                CTR: {ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(2) : '0.00'}%
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${getAdStatus(ad) === 'Hoạt động'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-surface-container-high text-on-surface'
                                                            }`}>
                                                            {getAdStatus(ad)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                                                        {new Date(ad.createdAt).toLocaleDateString('vi-VN')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setViewingAd(ad);
                                                                    setShowViewModal(true);
                                                                }}
                                                                className="text-primary hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                                title="Xem chi tiết"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                    <circle cx="12" cy="12" r="3" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingAd(ad);
                                                                    setShowCreateModal(true);
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
                                                                onClick={() => handleToggleActive(ad)}
                                                                className={ad.isActive
                                                                    ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300'
                                                                    : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                                }
                                                                title={ad.isActive ? 'Tắt' : 'Kích hoạt'}
                                                            >
                                                                {ad.isActive ? (
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <circle cx="12" cy="12" r="10" />
                                                                        <line x1="12" y1="8" x2="12" y2="16" />
                                                                        <line x1="8" y1="12" x2="16" y2="12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingAd(ad)}
                                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                                title="Xóa"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {meta && meta.totalPages > 1 && (
                            <div className="flex items-center justify-between bg-surface-container rounded-lg p-4 shadow-sm">
                                <div className="text-sm text-on-surface-variant">
                                    Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, meta.total)} trong tổng số {meta.total} quảng cáo
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        className="px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-sm"
                                        title="Trang đầu"
                                    >
                                        ««
                                    </button>
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={!meta.hasPrev}
                                        className="px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-sm"
                                    >
                                        Trước
                                    </button>
                                    {pageNumbers.map((pageNum, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                                            disabled={pageNum === '...' || pageNum === page}
                                            className={`px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-sm ${pageNum === page ? 'bg-primary text-on-primary border-blue-500' : ''
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={!meta.hasNext}
                                        className="px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-sm"
                                    >
                                        Sau
                                    </button>
                                    <button
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                        className="px-3 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high text-sm"
                                        title="Trang cuối"
                                    >
                                        »»
                                    </button>
                                    <div className="ml-4 flex items-center gap-2">
                                        <span className="text-sm text-on-surface-variant">Đến trang:</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            value={page}
                                            onChange={(e) => {
                                                const newPage = Number(e.target.value);
                                                if (newPage >= 1 && newPage <= totalPages) {
                                                    setPage(newPage);
                                                }
                                            }}
                                            className="w-16 px-2 py-1 border border-outline-variant rounded-lg dark:text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ads.length === 0 ? (
                            <div className="col-span-full bg-surface-container rounded-lg p-12 text-center shadow-sm">
                                <p className="text-on-surface-variant">Không có quảng cáo nào</p>
                            </div>
                        ) : (
                            ads.map((ad) => (
                                <AdCard
                                    key={ad.id}
                                    ad={ad}
                                    onEdit={() => {
                                        setEditingAd(ad);
                                        setShowCreateModal(true);
                                    }}
                                    onDelete={() => setDeletingAd(ad)}
                                    onToggleActive={() => handleToggleActive(ad)}
                                    onView={() => {
                                        setViewingAd(ad);
                                        setShowViewModal(true);
                                    }}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* View Ad Modal */}
            {showViewModal && viewingAd && (
                <ViewAdModal
                    ad={viewingAd}
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingAd(null);
                    }}
                />
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <AdFormModal
                    ad={editingAd}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingAd(null);
                    }}
                    onCreate={createMutation.mutateAsync}
                    onUpdate={updateMutation.mutateAsync}
                />
            )}

            {/* Delete Confirmation */}
            {deletingAd && (
                <ConfirmModal
                    isOpen={!!deletingAd}
                    title="Xóa quảng cáo"
                    message={`Bạn có chắc chắn muốn xóa quảng cáo "${deletingAd.title || 'Không có tiêu đề'}"?`}
                    onConfirm={handleDelete}
                    onClose={() => setDeletingAd(null)}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    confirmColor="red"
                    isLoading={deleteMutation.isPending}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && bulkAction && (
                <ConfirmModal
                    isOpen={showBulkActionModal}
                    onClose={() => {
                        setShowBulkActionModal(false);
                        setBulkAction(null);
                    }}
                    onConfirm={handleBulkAction}
                    title={
                        bulkAction === 'delete'
                            ? 'Xóa quảng cáo'
                            : bulkAction === 'activate'
                                ? 'Kích hoạt quảng cáo'
                                : 'Tắt quảng cáo'
                    }
                    message={`Bạn có chắc chắn muốn ${bulkAction === 'delete' ? 'xóa' : bulkAction === 'activate' ? 'kích hoạt' : 'tắt'} ${selectedAds.size} quảng cáo đã chọn?`}
                    confirmText={
                        bulkAction === 'delete'
                            ? 'Xóa'
                            : bulkAction === 'activate'
                                ? 'Kích hoạt'
                                : 'Tắt'
                    }
                    cancelText="Hủy"
                    confirmColor={
                        bulkAction === 'delete'
                            ? 'red'
                            : bulkAction === 'activate'
                                ? 'green'
                                : 'blue'
                    }
                    isLoading={bulkAction === 'delete' ? deleteMutation.isPending : updateMutation.isPending}
                />
            )}

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </AdminLayout>
    );
}

function AdCard({
    ad,
    onEdit,
    onDelete,
    onToggleActive,
    onView,
}: {
    ad: Ad;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: () => void;
    onView: () => void;
}) {
    const now = new Date();
    const isScheduled = ad.startDate || ad.endDate;
    const isInSchedule =
        (!ad.startDate || new Date(ad.startDate) <= now) &&
        (!ad.endDate || new Date(ad.endDate) >= now);
    const status = ad.isActive && isInSchedule ? 'Hoạt động' : 'Tắt';

    return (
        <div className="bg-surface-container rounded-lg shadow-sm overflow-hidden">
            <div className="relative h-48 bg-surface-container-high">
                {ad.imageUrl ? (
                    <Image
                        src={ad.imageUrl}
                        alt={ad.title || 'Quảng cáo'}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 400px"
                        unoptimized={ad.imageUrl.includes('cache.staticscdn.net')}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">
                        No Image
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-on-surface line-clamp-1">
                        {ad.title || 'Không có tiêu đề'}
                    </h3>
                    <span
                        className={`px-2 py-1 text-xs rounded-full ${status === 'Hoạt động'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-surface-container-high text-on-surface'
                            }`}
                    >
                        {status}
                    </span>
                </div>
                <div className="space-y-1 mb-3 text-sm text-on-surface-variant">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Loại:</span>
                        <span>{ad.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Vị trí:</span>
                        <span>{ad.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Lượt xem:</span>
                        <span>{ad.viewCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Lượt click:</span>
                        <span>{ad.clickCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">CTR:</span>
                        <span>{ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(2) : '0.00'}%</span>
                    </div>
                    {isScheduled && (
                        <div className="text-xs text-on-surface-variant">
                            {ad.startDate && `Từ: ${new Date(ad.startDate).toLocaleDateString('vi-VN')}`}
                            {ad.startDate && ad.endDate && ' - '}
                            {ad.endDate && `Đến: ${new Date(ad.endDate).toLocaleDateString('vi-VN')}`}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onView}
                        className="flex-1 px-3 py-2 bg-surface-variant hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-sm font-medium transition-colors"
                    >
                        Xem
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-sm font-medium transition-colors"
                    >
                        Sửa
                    </button>
                    <button
                        onClick={onToggleActive}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${ad.isActive
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                    >
                        {ad.isActive ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    );
}

function ViewAdModal({
    ad,
    onClose,
}: {
    ad: Ad;
    onClose: () => void;
}) {
    const now = new Date();
    const isScheduled = ad.startDate || ad.endDate;
    const isInSchedule =
        (!ad.startDate || new Date(ad.startDate) <= now) &&
        (!ad.endDate || new Date(ad.endDate) >= now);
    const status = ad.isActive && isInSchedule ? 'Hoạt động' : 'Tắt';
    const ctr = ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(2) : '0.00';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-on-surface">Chi tiết quảng cáo</h2>
                        <button
                            onClick={onClose}
                            className="text-on-surface-variant hover:text-on-surface-variant hover:text-on-surface"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="relative h-64 bg-surface-container-high rounded-lg overflow-hidden">
                            {ad.imageUrl ? (
                                <Image
                                    src={ad.imageUrl}
                                    alt={ad.title || 'Quảng cáo'}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 800px"
                                    unoptimized={ad.imageUrl.includes('cache.staticscdn.net')}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                    No Image
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Tiêu đề
                                </label>
                                <p className="text-on-surface">{ad.title || 'Không có tiêu đề'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Trạng thái
                                </label>
                                <span
                                    className={`inline-block px-2 py-1 text-xs rounded-full ${status === 'Hoạt động'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-surface-container-high text-on-surface'
                                        }`}
                                >
                                    {status}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Loại
                                </label>
                                <span
                                    className={`inline-block px-2 py-1 text-xs rounded-full ${ad.type === AdType.POPUP
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                        : ad.type === AdType.BANNER
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            : 'bg-surface-container-high text-on-surface'
                                        }`}
                                >
                                    {ad.type}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Vị trí
                                </label>
                                <p className="text-on-surface">{ad.position}</p>
                            </div>
                            {ad.linkUrl && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        Link quảng cáo
                                    </label>
                                    <a
                                        href={ad.linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline break-all"
                                    >
                                        {ad.linkUrl}
                                    </a>
                                </div>
                            )}
                            {ad.type === AdType.POPUP && ad.popupInterval && (
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        Số chương cần đọc
                                    </label>
                                    <p className="text-on-surface">
                                        {ad.popupInterval} chương
                                    </p>
                                </div>
                            )}
                            {ad.description && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        Mô tả
                                    </label>
                                    <p className="text-on-surface">{ad.description}</p>
                                </div>
                            )}
                            {isScheduled && (
                                <>
                                    {ad.startDate && (
                                        <div>
                                            <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                                Ngày bắt đầu
                                            </label>
                                            <p className="text-on-surface">
                                                {new Date(ad.startDate).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    )}
                                    {ad.endDate && (
                                        <div>
                                            <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                                Ngày kết thúc
                                            </label>
                                            <p className="text-on-surface">
                                                {new Date(ad.endDate).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Ngày tạo
                                </label>
                                <p className="text-on-surface">
                                    {new Date(ad.createdAt).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Ngày cập nhật
                                </label>
                                <p className="text-on-surface">
                                    {new Date(ad.updatedAt).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            {ad.createdBy && (
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        Người tạo
                                    </label>
                                    <p className="text-on-surface">
                                        {ad.createdBy.displayName || ad.createdBy.username}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Thống kê
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-surface-container-low p-3 rounded-lg">
                                    <div className="text-sm text-on-surface-variant">Lượt xem</div>
                                    <div className="text-2xl font-bold text-on-surface">
                                        {ad.viewCount.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-surface-container-low p-3 rounded-lg">
                                    <div className="text-sm text-on-surface-variant">Lượt click</div>
                                    <div className="text-2xl font-bold text-on-surface">
                                        {ad.clickCount.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-surface-container-low p-3 rounded-lg">
                                    <div className="text-sm text-on-surface-variant">CTR</div>
                                    <div className="text-2xl font-bold text-on-surface">
                                        {ctr}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdFormModal({
    ad,
    onClose,
    onCreate,
    onUpdate,
}: {
    ad: Ad | null;
    onClose: () => void;
    onCreate: (data: any) => Promise<any>;
    onUpdate: (data: { id: string; data: any }) => Promise<any>;
}) {
    const { showToast } = useToast();
    const [imageInputType, setImageInputType] = useState<'url' | 'upload'>(ad?.imageUrl ? 'url' : 'url');
    const [formData, setFormData] = useState({
        title: ad?.title || '',
        description: ad?.description || '',
        imageUrl: ad?.imageUrl || '',
        linkUrl: ad?.linkUrl || '',
        type: ad?.type || AdType.BANNER,
        position: ad?.position || AdPosition.BOTTOM,
        isActive: ad?.isActive ?? true,
        startDate: ad?.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : '',
        endDate: ad?.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '',
        popupInterval: ad?.popupInterval || 3,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(ad?.imageUrl || null);

    // Auto-set position based on type
    useEffect(() => {
        if (formData.type === AdType.POPUP) {
            // POPUP - backend sẽ xử lý position (giữ giá trị hiện tại, backend có thể bỏ qua)
            // Không cần set position, nhưng vẫn giữ trong formData để không lỗi validation
        } else if (formData.type === AdType.BANNER) {
            // BANNER chỉ có BOTTOM
            setFormData(prev => ({ ...prev, position: AdPosition.BOTTOM }));
        } else if (formData.type === AdType.SIDEBAR) {
            // SIDEBAR chỉ có SIDEBAR_LEFT
            setFormData(prev => ({ ...prev, position: AdPosition.SIDEBAR_LEFT }));
        }
    }, [formData.type]);

    // Update preview when imageUrl changes
    useEffect(() => {
        if (formData.imageUrl && imageInputType === 'url') {
            setPreviewUrl(formData.imageUrl);
        } else if (!formData.imageUrl) {
            setPreviewUrl(null);
        }
    }, [formData.imageUrl, imageInputType]);

    // Handle image error
    const handleImageError = useCallback(() => {
        setPreviewUrl(null);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!uploadedFile) return;

        setIsUploading(true);
        try {
            const { adsService } = await import('@/lib/api/ads.service');
            const response = await adsService.uploadImage(uploadedFile);
            if (response.data?.imageUrl) {
                setFormData({ ...formData, imageUrl: response.data.imageUrl });
                setPreviewUrl(response.data.imageUrl);
                setImageInputType('url'); // Switch to URL view after upload
                setUploadedFile(null);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Lỗi khi upload ảnh. Vui lòng thử lại.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If using upload but haven't uploaded yet
        if (imageInputType === 'upload' && uploadedFile && !formData.imageUrl.includes('cloudinary')) {
            await handleUpload();
            // Wait a bit for upload to complete
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!formData.imageUrl) {
            alert('Vui lòng nhập URL ảnh hoặc upload ảnh');
            return;
        }

        setIsSubmitting(true);

        try {
            const submitData = {
                ...formData,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
                popupInterval: formData.type === AdType.POPUP ? formData.popupInterval : undefined,
                // Position đã được set tự động trong useEffect:
                // - BANNER: BOTTOM
                // - SIDEBAR: SIDEBAR_LEFT
                // - POPUP: backend sẽ xử lý (giữ giá trị hiện tại, backend có thể bỏ qua)
            };

            if (ad) {
                await onUpdate({ id: ad.id, data: submitData });
                showToast('Đã cập nhật quảng cáo thành công', 'success');
            } else {
                await onCreate(submitData);
                showToast('Đã tạo quảng cáo thành công', 'success');
            }
            onClose();
        } catch (error) {
            console.error('Error saving ad:', error);
            showToast('Có lỗi xảy ra khi lưu quảng cáo', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-on-surface">
                            {ad ? 'Chỉnh sửa quảng cáo' : 'Tạo quảng cáo mới'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-on-surface-variant hover:text-on-surface-variant hover:text-on-surface"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Tiêu đề (tùy chọn)
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Mô tả (tùy chọn)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Ảnh quảng cáo <span className="text-red-500">*</span>
                            </label>

                            {/* Tabs for URL/Upload */}
                            <div className="flex gap-2 mb-3 border-b border-outline-variant">
                                <button
                                    type="button"
                                    onClick={() => setImageInputType('url')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${imageInputType === 'url'
                                        ? 'border-b-2 border-blue-500 text-primary'
                                        : 'text-on-surface-variant hover:text-on-surface-variant'
                                        }`}
                                >
                                    Nhập URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageInputType('upload')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${imageInputType === 'upload'
                                        ? 'border-b-2 border-blue-500 text-primary'
                                        : 'text-on-surface-variant hover:text-on-surface-variant'
                                        }`}
                                >
                                    Upload ảnh
                                </button>
                            </div>

                            {imageInputType === 'url' ? (
                                <div className="space-y-3">
                                    <input
                                        type="url"
                                        required={imageInputType === 'url'}
                                        value={formData.imageUrl}
                                        onChange={(e) => {
                                            setFormData({ ...formData, imageUrl: e.target.value });
                                        }}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                                    />
                                    {previewUrl && (
                                        <div className="relative w-full h-48 bg-surface-container-high rounded-lg overflow-hidden">
                                            <Image
                                                src={previewUrl}
                                                alt="Preview"
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, 400px"
                                                onError={handleImageError}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <div className="px-4 py-2 border-2 border-dashed border-outline-variant rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-surface-variant">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                    <span className="text-sm text-on-surface-variant">
                                                        {uploadedFile ? uploadedFile.name : 'Chọn ảnh để upload'}
                                                    </span>
                                                </div>
                                            </div>
                                        </label>
                                        {uploadedFile && (
                                            <button
                                                type="button"
                                                onClick={handleUpload}
                                                disabled={isUploading}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isUploading ? 'Đang upload...' : 'Upload'}
                                            </button>
                                        )}
                                    </div>
                                    {previewUrl && (
                                        <div className="relative w-full h-48 bg-surface-container-high rounded-lg overflow-hidden">
                                            <Image
                                                src={previewUrl}
                                                alt="Preview"
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, 400px"
                                                onError={handleImageError}
                                            />
                                        </div>
                                    )}
                                    {formData.imageUrl && formData.imageUrl.includes('cloudinary') && (
                                        <div className="text-sm text-green-600 dark:text-green-400">
                                            ✓ Ảnh đã được upload thành công
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Link quảng cáo (tùy chọn)
                            </label>
                            <input
                                type="url"
                                value={formData.linkUrl}
                                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Loại <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as AdType })}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                            >
                                <option value={AdType.POPUP}>Popup</option>
                                <option value={AdType.BANNER}>Banner</option>
                                <option value={AdType.SIDEBAR}>Sidebar</option>
                            </select>
                        </div>

                        {/* Position field - chỉ hiển thị cho SIDEBAR type */}
                        {formData.type === AdType.SIDEBAR && (
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Vị trí <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value as AdPosition })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                                >
                                    <option value={AdPosition.SIDEBAR_LEFT}>Sidebar Left</option>
                                </select>
                            </div>
                        )}

                        {/* Hiển thị thông tin position cho POPUP và BANNER (read-only) */}
                        {(formData.type === AdType.POPUP || formData.type === AdType.BANNER) && (
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Vị trí
                                </label>
                                <div className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-on-surface-variant">
                                    {formData.type === AdType.POPUP ? 'Giữa màn hình (tự động)' : 'Bottom (tự động)'}
                                </div>
                            </div>
                        )}

                        {/* Popup Interval - Only show for POPUP type */}
                        {formData.type === AdType.POPUP && (
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Số chương cần đọc trước khi hiển thị
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={formData.popupInterval}
                                    onChange={(e) => setFormData({ ...formData, popupInterval: parseInt(e.target.value) || 3 })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                                    placeholder="3"
                                />
                                <p className="mt-1 text-xs text-on-surface-variant">
                                    Quảng cáo sẽ hiển thị sau khi người dùng đọc đủ số chương này (mặc định: 3)
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Ngày bắt đầu (tùy chọn)
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Ngày kết thúc (tùy chọn)
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-on-surface-variant">
                                Đang hoạt động
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Đang lưu...' : ad ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
