'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { useApprovals, useReviewApproval } from '@/lib/api/hooks/use-approvals';
import { ApprovalRequest } from '@/lib/api/hooks/use-approvals';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminApprovalsPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('');
    const [reviewingRequest, setReviewingRequest] = useState<ApprovalRequest | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

    const { data, isLoading } = useApprovals({
        page,
        limit: 20,
        status: statusFilter || undefined,
    });

    const reviewMutation = useReviewApproval();

    const requests = data?.data || [];
    const meta = data?.meta;

    const handleReview = async () => {
        if (reviewingRequest) {
            await reviewMutation.mutateAsync({
                id: reviewingRequest.id,
                data: {
                    status: reviewStatus,
                    adminNote: reviewNote,
                },
            });
            setReviewingRequest(null);
            setReviewNote('');
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Duyệt truyện</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Duyệt các yêu cầu publish truyện và chương</p>
                </div>

                {/* Filter */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as any);
                                setPage(1);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Tất cả</option>
                            <option value="PENDING">Đang chờ</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="REJECTED">Đã từ chối</option>
                        </select>
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
                    <div className="space-y-4">
                        {requests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-l-4 border-blue-500"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            {request.story?.coverImage && (
                                                <div className="relative w-20 h-28 rounded overflow-hidden">
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
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
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
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                    {new Date(request.createdAt).toLocaleString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {request.status === 'PENDING' && (
                                        <div className="flex gap-2 ml-4">
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Hiển thị {((page - 1) * 20) + 1} - {Math.min(page * 20, meta.total)} trong tổng số {meta.total} yêu cầu
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={!meta.hasPrev}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Trước
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={!meta.hasNext}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

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
        </AdminLayout>
    );
}

