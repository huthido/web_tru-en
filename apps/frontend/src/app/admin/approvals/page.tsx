'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { useApprovals, useReviewApproval } from '@/lib/api/hooks/use-approvals';
import { ApprovalRequest } from '@/lib/api/hooks/use-approvals';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast, ToastContainer } from '@/components/ui/toast';
import Link from 'next/link';
import Image from 'next/image';
import * as XLSX from 'xlsx';

export default function AdminApprovalsPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('');
    const [typeFilter, setTypeFilter] = useState<'STORY_PUBLISH' | 'CHAPTER_PUBLISH' | ''>('');
    const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'type'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
    const [showBulkActionModal, setShowBulkActionModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [bulkNote, setBulkNote] = useState('');
    const [viewingRequest, setViewingRequest] = useState<ApprovalRequest | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [reviewingRequest, setReviewingRequest] = useState<ApprovalRequest | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const { data, isLoading } = useApprovals({
        page,
        limit,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchTerm || undefined,
    });

    const reviewMutation = useReviewApproval();
    const { toasts, showToast, removeToast } = useToast();

    const requests = data?.data || [];
    const meta = data?.meta;

    // Sort requests client-side
    const sortedRequests = useMemo(() => {
        const sorted = [...requests];
        sorted.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortBy === 'createdAt') {
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
            } else if (sortBy === 'status') {
                aValue = a.status;
                bValue = b.status;
            } else if (sortBy === 'type') {
                aValue = a.type;
                bValue = b.type;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        return sorted;
    }, [requests, sortBy, sortOrder]);

    const handleReview = async () => {
        if (reviewingRequest) {
            try {
                await reviewMutation.mutateAsync({
                    id: reviewingRequest.id,
                    data: {
                        status: reviewStatus,
                        adminNote: reviewNote,
                    },
                });
                setReviewingRequest(null);
                setReviewNote('');
                setSelectedRequests(new Set());
                const statusText = reviewStatus === 'APPROVED' ? 'phê duyệt' : 'từ chối';
                showToast(`Đã ${statusText} yêu cầu thành công`, 'success');
            } catch (error) {
                showToast('Có lỗi xảy ra khi xử lý yêu cầu', 'error');
            }
        }
    };

    const handleBulkReview = async () => {
        if (!bulkAction || selectedRequests.size === 0) return;

        try {
            const promises = Array.from(selectedRequests).map((requestId) =>
                reviewMutation.mutateAsync({
                    id: requestId,
                    data: {
                        status: bulkAction,
                        adminNote: bulkNote,
                    },
                })
            );

            await Promise.all(promises);
            const statusText = bulkAction === 'APPROVED' ? 'phê duyệt' : 'từ chối';
            showToast(`Đã ${statusText} ${selectedRequests.size} yêu cầu thành công`, 'success');
            setSelectedRequests(new Set());
            setShowBulkActionModal(false);
            setBulkAction(null);
            setBulkNote('');
        } catch (error) {
            showToast('Có lỗi xảy ra khi xử lý yêu cầu', 'error');
        }
    };

    const toggleSelectRequest = (requestId: string) => {
        const newSelected = new Set(selectedRequests);
        if (newSelected.has(requestId)) {
            newSelected.delete(requestId);
        } else {
            newSelected.add(requestId);
        }
        setSelectedRequests(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedRequests.size === sortedRequests.filter(r => r.status === 'PENDING').length) {
            setSelectedRequests(new Set());
        } else {
            const pendingIds = sortedRequests.filter(r => r.status === 'PENDING').map(r => r.id);
            setSelectedRequests(new Set(pendingIds));
        }
    };

    const handleExportExcel = () => {
        const exportData = sortedRequests.map((request) => ({
            'ID': request.id,
            'Loại': request.type === 'STORY_PUBLISH' ? 'Truyện' : 'Chương',
            'Tiêu đề': request.story?.title || request.chapter?.title || '',
            'Tác giả': request.user?.displayName || request.user?.username || '',
            'Trạng thái': request.status === 'PENDING' ? 'Đang chờ' : request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối',
            'Tin nhắn': request.message || '',
            'Ghi chú admin': request.adminNote || '',
            'Người duyệt': request.reviewer?.displayName || request.reviewer?.username || '',
            'Ngày tạo': new Date(request.createdAt).toLocaleString('vi-VN'),
            'Ngày duyệt': request.reviewedAt ? new Date(request.reviewedAt).toLocaleString('vi-VN') : '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Yêu cầu duyệt');

        // Auto-size columns
        const colWidths = [
            { wch: 30 }, // ID
            { wch: 12 }, // Loại
            { wch: 30 }, // Tiêu đề
            { wch: 20 }, // Tác giả
            { wch: 12 }, // Trạng thái
            { wch: 40 }, // Tin nhắn
            { wch: 40 }, // Ghi chú admin
            { wch: 20 }, // Người duyệt
            { wch: 20 }, // Ngày tạo
            { wch: 20 }, // Ngày duyệt
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `approvals_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Duyệt truyện</h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Duyệt các yêu cầu publish truyện và chương</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedRequests.size > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Đã chọn: {selectedRequests.size}
                                </span>
                                <button
                                    onClick={() => {
                                        setBulkAction('APPROVED');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Duyệt hàng loạt
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction('REJECTED');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Từ chối hàng loạt
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                List
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                Grid
                            </button>
                        </div>
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
                        <RefreshButton queryKeys={[['approvals']]} />
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tìm kiếm
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Tìm theo tên truyện, chương, tác giả..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Loại
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value as any);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value="STORY_PUBLISH">Truyện</option>
                                <option value="CHAPTER_PUBLISH">Chương</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as any);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value="PENDING">Đang chờ</option>
                                <option value="APPROVED">Đã duyệt</option>
                                <option value="REJECTED">Đã từ chối</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Số lượng/trang
                            </label>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sắp xếp theo
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="createdAt">Ngày tạo</option>
                                <option value="status">Trạng thái</option>
                                <option value="type">Loại</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Thứ tự
                            </label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="desc">Giảm dần</option>
                                <option value="asc">Tăng dần</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Requests List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loading />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400">Không có yêu cầu nào</p>
                    </div>
                ) : (
                    <>
                        {sortedRequests.filter(r => r.status === 'PENDING').length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedRequests.size === sortedRequests.filter(r => r.status === 'PENDING').length && sortedRequests.filter(r => r.status === 'PENDING').length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Chọn tất cả ({sortedRequests.filter(r => r.status === 'PENDING').length} yêu cầu đang chờ)
                                    </span>
                                </label>
                            </div>
                        )}
                        
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {sortedRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${
                                            request.status === 'PENDING' ? 'border-yellow-500' :
                                            request.status === 'APPROVED' ? 'border-green-500' : 'border-red-500'
                                        } ${selectedRequests.has(request.id) ? 'ring-2 ring-blue-500' : ''} overflow-hidden`}
                                    >
                                        {/* Cover Image */}
                                        {request.story?.coverImage && (
                                            <div className="relative w-full h-40 bg-gray-200 dark:bg-gray-700">
                                                <Image
                                                    src={request.story.coverImage}
                                                    alt={request.story.title}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                                />
                                                {request.status === 'PENDING' && (
                                                    <div className="absolute top-2 left-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRequests.has(request.id)}
                                                            onChange={() => toggleSelectRequest(request.id)}
                                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full ${
                                                            request.type === 'STORY_PUBLISH'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-green-500 text-white'
                                                        }`}
                                                    >
                                                        {request.type === 'STORY_PUBLISH' ? 'Truyện' : 'Chương'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Content */}
                                        <div className="p-4">
                                            <h3 
                                                className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                onClick={() => {
                                                    setViewingRequest(request);
                                                    setShowViewModal(true);
                                                }}
                                            >
                                                {request.story?.title || request.chapter?.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {request.user?.displayName || request.user?.username}
                                            </p>
                                            
                                            <span
                                                className={`inline-block px-2 py-1 text-xs rounded-full mb-3 ${
                                                    request.status === 'PENDING'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        : request.status === 'APPROVED'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}
                                            >
                                                {request.status === 'PENDING'
                                                    ? 'Đang chờ'
                                                    : request.status === 'APPROVED'
                                                    ? 'Đã duyệt'
                                                    : 'Đã từ chối'}
                                            </span>
                                            
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                {new Date(request.createdAt).toLocaleString('vi-VN')}
                                            </p>
                                            
                                            {/* Actions */}
                                            {request.status === 'PENDING' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setReviewingRequest(request);
                                                            setReviewStatus('APPROVED');
                                                            setReviewNote('');
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
                                                    >
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setReviewingRequest(request);
                                                            setReviewStatus('REJECTED');
                                                            setReviewNote('');
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
                                                    >
                                                        Từ chối
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedRequests.map((request) => (
                            <div
                                key={request.id}
                                className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-l-4 ${
                                    request.status === 'PENDING' ? 'border-yellow-500' :
                                    request.status === 'APPROVED' ? 'border-green-500' : 'border-red-500'
                                } ${selectedRequests.has(request.id) ? 'ring-2 ring-blue-500' : ''}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4 mb-4">
                                            {request.status === 'PENDING' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRequests.has(request.id)}
                                                    onChange={() => toggleSelectRequest(request.id)}
                                                    className="mt-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            )}
                                            {request.story?.coverImage && (
                                                <div className="relative w-20 h-28 rounded overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={request.story.coverImage}
                                                        alt={request.story.title}
                                                        fill
                                                        className="object-cover"
                                                        sizes="80px"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full ${
                                                            request.type === 'STORY_PUBLISH'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        }`}
                                                    >
                                                        {request.type === 'STORY_PUBLISH' ? 'Truyện' : 'Chương'}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full ${
                                                            request.status === 'PENDING'
                                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                : request.status === 'APPROVED'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }`}
                                                    >
                                                        {request.status === 'PENDING'
                                                            ? 'Đang chờ'
                                                            : request.status === 'APPROVED'
                                                            ? 'Đã duyệt'
                                                            : 'Đã từ chối'}
                                                    </span>
                                                </div>
                                                <h3 
                                                    className="text-lg font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                                    onClick={() => {
                                                        setViewingRequest(request);
                                                        setShowViewModal(true);
                                                    }}
                                                >
                                                    {request.story?.title || request.chapter?.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    Tác giả: {request.user?.displayName || request.user?.username}
                                                </p>
                                                {request.message && (
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                        {request.message}
                                                    </p>
                                                )}
                                                {request.adminNote && (
                                                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                            Ghi chú của admin:
                                                        </p>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                                            {request.adminNote}
                                                        </p>
                                                    </div>
                                                )}
                                                {request.reviewer && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                        Duyệt bởi: {request.reviewer.displayName || request.reviewer.username} 
                                                        {request.reviewedAt && ` - ${new Date(request.reviewedAt).toLocaleString('vi-VN')}`}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                    {new Date(request.createdAt).toLocaleString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 ml-4">
                                        {request.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setReviewingRequest(request);
                                                        setReviewStatus('APPROVED');
                                                        setReviewNote('');
                                                    }}
                                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Duyệt
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReviewingRequest(request);
                                                        setReviewStatus('REJECTED');
                                                        setReviewNote('');
                                                    }}
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Từ chối
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                setViewingRequest(request);
                                                setShowViewModal(true);
                                            }}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Chi tiết
                                        </button>
                                    </div>
                                </div>
                            </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, meta.total)} trong tổng số {meta.total} yêu cầu
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Đầu
                                </button>
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={!meta.hasPrev}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Trước
                                </button>
                                
                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (meta.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= meta.totalPages - 2) {
                                            pageNum = meta.totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                                                    page === pageNum
                                                        ? 'bg-blue-500 text-white border-blue-500'
                                                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={!meta.hasNext}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Sau
                                </button>
                                <button
                                    onClick={() => setPage(meta.totalPages)}
                                    disabled={page === meta.totalPages}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Cuối
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            {showViewModal && viewingRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chi tiết yêu cầu</h2>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewingRequest(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Loại
                                        </label>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {viewingRequest.type === 'STORY_PUBLISH' ? 'Truyện' : 'Chương'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Trạng thái
                                        </label>
                                        <span
                                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                                                viewingRequest.status === 'PENDING'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                    : viewingRequest.status === 'APPROVED'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            }`}
                                        >
                                            {viewingRequest.status === 'PENDING'
                                                ? 'Đang chờ'
                                                : viewingRequest.status === 'APPROVED'
                                                ? 'Đã duyệt'
                                                : 'Đã từ chối'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tiêu đề
                                    </label>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {viewingRequest.story?.title || viewingRequest.chapter?.title}
                                    </p>
                                </div>

                                {viewingRequest.story?.coverImage && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Ảnh bìa
                                        </label>
                                        <div className="relative w-32 h-44 rounded overflow-hidden">
                                            <Image
                                                src={viewingRequest.story.coverImage}
                                                alt={viewingRequest.story.title}
                                                fill
                                                className="object-cover"
                                                sizes="128px"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tác giả
                                    </label>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {viewingRequest.user?.displayName || viewingRequest.user?.username}
                                    </p>
                                </div>

                                {viewingRequest.message && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Tin nhắn
                                        </label>
                                        <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            {viewingRequest.message}
                                        </p>
                                    </div>
                                )}

                                {viewingRequest.adminNote && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ghi chú của admin
                                        </label>
                                        <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            {viewingRequest.adminNote}
                                        </p>
                                    </div>
                                )}

                                {viewingRequest.reviewer && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Người duyệt
                                        </label>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {viewingRequest.reviewer.displayName || viewingRequest.reviewer.username}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ngày tạo
                                        </label>
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            {new Date(viewingRequest.createdAt).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    {viewingRequest.reviewedAt && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Ngày duyệt
                                            </label>
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {new Date(viewingRequest.reviewedAt).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowViewModal(false);
                                            setViewingRequest(null);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Đóng
                                    </button>
                                    {viewingRequest.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setShowViewModal(false);
                                                    setReviewingRequest(viewingRequest);
                                                    setReviewStatus('APPROVED');
                                                    setReviewNote('');
                                                }}
                                                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Duyệt
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowViewModal(false);
                                                    setReviewingRequest(viewingRequest);
                                                    setReviewStatus('REJECTED');
                                                    setReviewNote('');
                                                }}
                                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Từ chối
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && bulkAction && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {bulkAction === 'APPROVED' ? 'Duyệt hàng loạt' : 'Từ chối hàng loạt'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowBulkActionModal(false);
                                        setBulkAction(null);
                                        setBulkNote('');
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Bạn đang {bulkAction === 'APPROVED' ? 'duyệt' : 'từ chối'} {selectedRequests.size} yêu cầu.
                                </p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ghi chú (tùy chọn)
                                    </label>
                                    <textarea
                                        value={bulkNote}
                                        onChange={(e) => setBulkNote(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="Nhập ghi chú cho tác giả..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBulkActionModal(false);
                                            setBulkAction(null);
                                            setBulkNote('');
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleBulkReview}
                                        disabled={reviewMutation.isPending}
                                        className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                            bulkAction === 'APPROVED'
                                                ? 'bg-green-500 hover:bg-green-600'
                                                : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                    >
                                        {reviewMutation.isPending
                                            ? 'Đang xử lý...'
                                            : bulkAction === 'APPROVED'
                                            ? 'Duyệt'
                                            : 'Từ chối'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewingRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {reviewStatus === 'APPROVED' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setReviewingRequest(null);
                                        setReviewNote('');
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ghi chú (tùy chọn)
                                    </label>
                                    <textarea
                                        value={reviewNote}
                                        onChange={(e) => setReviewNote(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        placeholder="Nhập ghi chú cho tác giả..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReviewingRequest(null);
                                            setReviewNote('');
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleReview}
                                        disabled={reviewMutation.isPending}
                                        className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                            reviewStatus === 'APPROVED'
                                                ? 'bg-green-500 hover:bg-green-600'
                                                : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                    >
                                        {reviewMutation.isPending
                                            ? 'Đang xử lý...'
                                            : reviewStatus === 'APPROVED'
                                            ? 'Duyệt'
                                            : 'Từ chối'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </AdminLayout>
    );
}

