'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useAdminComments, useModerateComment } from '@/lib/api/hooks/use-comments';
import { AdminComment, AdminCommentsResponse } from '@/lib/api/comments.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToastContext } from '@/components/providers/toast-provider';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function AdminCommentsPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [search, setSearch] = useState('');
    const [storyIdFilter, setStoryIdFilter] = useState('');
    const [userIdFilter, setUserIdFilter] = useState('');
    const [isDeletedFilter, setIsDeletedFilter] = useState<string>('');
    const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewingComment, setViewingComment] = useState<AdminComment | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [moderatingComment, setModeratingComment] = useState<AdminComment | null>(null);
    const [moderationAction, setModerationAction] = useState<'approve' | 'delete' | 'restore' | null>(null);
    const [showModerateModal, setShowModerateModal] = useState(false);
    const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
    const { showToast } = useToastContext();

    const { data, isLoading, refetch } = useAdminComments({
        page,
        limit,
        search: search || undefined,
        storyId: storyIdFilter || undefined,
        userId: userIdFilter || undefined,
        isDeleted: isDeletedFilter || undefined,
        sortBy,
        sortOrder,
    });

    const moderateMutation = useModerateComment();

    // Debug: log data to see structure
    if (data) {
        // Debug logs removed for performance
    }

    // Handle both direct and wrapped response structures
    let comments: AdminComment[] = [];
    let meta: any = null;

    if (data) {
        // Check if data is already the AdminCommentsResponse structure
        if ('data' in data && 'meta' in data) {
            comments = (data as AdminCommentsResponse).data || [];
            meta = (data as AdminCommentsResponse).meta;
        } else if (Array.isArray(data)) {
            // If data is directly an array (shouldn't happen but handle it)
            comments = data as any;
        }
    }

    // Debug logs removed for performance

    const handleModerate = async () => {
        if (!moderatingComment || !moderationAction) return;

        await moderateMutation.mutateAsync({
            commentId: moderatingComment.id,
            action: moderationAction,
        });

        setShowModerateModal(false);
        setModeratingComment(null);
        setModerationAction(null);
    };

    const handleBulkModerate = async (action: 'approve' | 'delete' | 'restore') => {
        if (selectedComments.size === 0) return;

        const promises = Array.from(selectedComments).map((commentId) =>
            moderateMutation.mutateAsync({ commentId, action })
        );

        await Promise.all(promises);
        setSelectedComments(new Set());
        showToast(`Đã ${action === 'approve' ? 'phê duyệt' : action === 'delete' ? 'xóa' : 'khôi phục'} ${selectedComments.size} bình luận`, 'success');
    };

    const handleExportExcel = () => {
        const exportData = comments.map((comment) => ({
            'ID': comment.id,
            'Nội dung': comment.isDeleted ? '[Đã xóa]' : comment.content.substring(0, 100),
            'Người dùng': comment.user.displayName || comment.user.username,
            'Truyện': comment.story?.title || 'N/A',
            'Chương': comment.chapter?.title || 'N/A',
            'Trạng thái': comment.isDeleted ? 'Đã xóa' : 'Hoạt động',
            'Số phản hồi': comment.replyCount || 0,
            'Ngày tạo': new Date(comment.createdAt).toLocaleString('vi-VN'),
            'Ngày cập nhật': new Date(comment.updatedAt).toLocaleString('vi-VN'),
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Bình luận');
        XLSX.writeFile(wb, `comments_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Đã xuất file Excel thành công', 'success');
    };

    const handleSelectAll = () => {
        if (selectedComments.size === comments.length) {
            setSelectedComments(new Set());
        } else {
            setSelectedComments(new Set(comments.map((c) => c.id)));
        }
    };

    const handleSelectComment = (commentId: string) => {
        const newSelected = new Set(selectedComments);
        if (newSelected.has(commentId)) {
            newSelected.delete(commentId);
        } else {
            newSelected.add(commentId);
        }
        setSelectedComments(newSelected);
    };

    const filteredComments = useMemo(() => {
        return comments;
    }, [comments]);

    if (isLoading) {
        return (
            <AdminLayout>
                <Loading />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Quản lý bình luận</h1>
                    <div className="flex gap-2">
                        <RefreshButton onRefresh={refetch} />
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Tìm kiếm</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Tìm trong nội dung..."
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ID Truyện</label>
                            <input
                                type="text"
                                value={storyIdFilter}
                                onChange={(e) => {
                                    setStoryIdFilter(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Lọc theo truyện..."
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ID Người dùng</label>
                            <input
                                type="text"
                                value={userIdFilter}
                                onChange={(e) => {
                                    setUserIdFilter(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Lọc theo người dùng..."
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Trạng thái</label>
                            <select
                                value={isDeletedFilter}
                                onChange={(e) => {
                                    setIsDeletedFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">Tất cả</option>
                                <option value="false">Hoạt động</option>
                                <option value="true">Đã xóa</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Sắp xếp theo</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'updatedAt')}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="createdAt">Ngày tạo</option>
                                <option value="updatedAt">Ngày cập nhật</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thứ tự</label>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="desc">Mới nhất</option>
                                <option value="asc">Cũ nhất</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedComments.size > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-blue-700 dark:text-blue-300">
                            Đã chọn {selectedComments.size} bình luận
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkModerate('delete')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Xóa
                            </button>
                            <button
                                onClick={() => handleBulkModerate('restore')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Khôi phục
                            </button>
                            <button
                                onClick={() => setSelectedComments(new Set())}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng số</div>
                        <div className="text-2xl font-bold">{meta?.total || 0}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Hoạt động</div>
                        <div className="text-2xl font-bold text-green-600">
                            {comments.filter((c) => !c.isDeleted).length}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Đã xóa</div>
                        <div className="text-2xl font-bold text-red-600">
                            {comments.filter((c) => c.isDeleted).length}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Trang hiện tại</div>
                        <div className="text-2xl font-bold">
                            {meta?.page || 1} / {meta?.totalPages || 1}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedComments.size === comments.length && comments.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left">Nội dung</th>
                                    <th className="px-4 py-3 text-left">Người dùng</th>
                                    <th className="px-4 py-3 text-left">Truyện/Chương</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Phản hồi</th>
                                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                                    <th className="px-4 py-3 text-left">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredComments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                            Không có bình luận nào
                                        </td>
                                    </tr>
                                ) : (
                                    filteredComments.map((comment) => (
                                        <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedComments.has(comment.id)}
                                                    onChange={() => handleSelectComment(comment.id)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="max-w-md">
                                                    {comment.isDeleted ? (
                                                        <span className="text-gray-400 italic">[Đã xóa]</span>
                                                    ) : (
                                                        <div className="line-clamp-2 text-sm">
                                                            {comment.content}
                                                        </div>
                                                    )}
                                                    {comment.parentId && (
                                                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                                                            (Phản hồi)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {comment.user.avatar && (
                                                        <img
                                                            src={comment.user.avatar}
                                                            alt={comment.user.username}
                                                            className="w-8 h-8 rounded-full"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">
                                                            {comment.user.displayName || comment.user.username}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{comment.user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {comment.story ? (
                                                        <div>
                                                            <Link
                                                                href={`/truyen/${comment.story.slug}`}
                                                                className="text-blue-600 hover:underline text-sm font-medium"
                                                                target="_blank"
                                                            >
                                                                {comment.story.title}
                                                            </Link>
                                                            {comment.chapter && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    Chương: {comment.chapter.title}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : comment.chapter ? (
                                                        <div className="text-sm">
                                                            <span className="text-gray-600 dark:text-gray-400">Chương:</span>
                                                            <span className="ml-1">{comment.chapter.title}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">N/A</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${comment.isDeleted
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        }`}
                                                >
                                                    {comment.isDeleted ? 'Đã xóa' : 'Hoạt động'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{comment.replyCount || 0}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                                                </div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                                    {new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setViewingComment(comment);
                                                            setShowViewModal(true);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        Xem
                                                    </button>
                                                    {comment.isDeleted ? (
                                                        <button
                                                            onClick={() => {
                                                                setModeratingComment(comment);
                                                                setModerationAction('restore');
                                                                setShowModerateModal(true);
                                                            }}
                                                            className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                                            title="Khôi phục bình luận"
                                                        >
                                                            Khôi phục
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setModeratingComment(comment);
                                                                setModerationAction('delete');
                                                                setShowModerateModal(true);
                                                            }}
                                                            className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                            title="Xóa bình luận"
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
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
                    <div className="flex justify-center items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border rounded-lg disabled:opacity-50"
                        >
                            Trước
                        </button>
                        <span className="px-4 py-2">
                            Trang {meta.page} / {meta.totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="px-4 py-2 border rounded-lg disabled:opacity-50"
                        >
                            Sau
                        </button>
                    </div>
                )}

                {/* View Modal */}
                {showViewModal && viewingComment && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Chi tiết bình luận</h2>
                                <button
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewingComment(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nội dung</label>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded whitespace-pre-wrap break-words">
                                        {viewingComment.isDeleted ? (
                                            <span className="text-gray-400 italic">[Đã xóa] {viewingComment.content}</span>
                                        ) : (
                                            viewingComment.content
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ID Bình luận</label>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                                        {viewingComment.id}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Người dùng</label>
                                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            {viewingComment.user.displayName || viewingComment.user.username}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Trạng thái</label>
                                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            {viewingComment.isDeleted ? 'Đã xóa' : 'Hoạt động'}
                                        </div>
                                    </div>
                                </div>
                                {viewingComment.story && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Truyện</label>
                                        <Link
                                            href={`/truyen/${viewingComment.story?.slug}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {viewingComment.story.title}
                                        </Link>
                                    </div>
                                )}
                                {viewingComment.chapter && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Chương</label>
                                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            {viewingComment.chapter.title}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Số phản hồi</label>
                                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                        {viewingComment.replyCount || 0}
                                    </div>
                                </div>
                                {viewingComment.parentId && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">ID Bình luận cha</label>
                                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                                            {viewingComment.parentId}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Ngày tạo</label>
                                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            {new Date(viewingComment.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Ngày cập nhật</label>
                                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            {new Date(viewingComment.updatedAt).toLocaleString('vi-VN')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Moderate Modal */}
                <ConfirmModal
                    isOpen={showModerateModal}
                    onClose={() => {
                        setShowModerateModal(false);
                        setModeratingComment(null);
                        setModerationAction(null);
                    }}
                    onConfirm={handleModerate}
                    title={`${moderationAction === 'approve' ? 'Phê duyệt' : moderationAction === 'delete' ? 'Xóa' : 'Khôi phục'} bình luận`}
                    message={`Bạn có chắc chắn muốn ${moderationAction === 'approve' ? 'phê duyệt' : moderationAction === 'delete' ? 'xóa' : 'khôi phục'} bình luận này không?`}
                    confirmText={moderationAction === 'approve' ? 'Phê duyệt' : moderationAction === 'delete' ? 'Xóa' : 'Khôi phục'}
                    confirmColor={moderationAction === 'delete' ? 'red' : 'green'}
                />
            </div>
        </AdminLayout>
    );
}

