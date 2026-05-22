'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast } from '@/components/ui/toast';
import { useStories, useUpdateStory, useDeleteStory } from '@/lib/api/hooks/use-stories';
import { Story } from '@/lib/api/stories.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import Link from 'next/link';
import Image from 'next/image';
import * as XLSX from 'xlsx';

export default function AdminStoriesPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED' | ''>('');
    const [recommendedFilter, setRecommendedFilter] = useState<boolean | ''>('');
    const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'viewCount' | 'rating' | 'likeCount'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
    const [deletingStory, setDeletingStory] = useState<Story | null>(null);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [isRecommended, setIsRecommended] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    const { data, isLoading } = useStories({
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        sortBy: sortBy === 'createdAt' ? 'newest' : sortBy === 'viewCount' ? 'viewCount' : sortBy === 'rating' ? 'rating' : 'popular',
    });

    const updateMutation = useUpdateStory();
    const deleteMutation = useDeleteStory();
    const { toasts, showToast, removeToast } = useToast();

    // Debug: log data to see what we're getting
    if (data) {
        console.log('Stories API Response:', data);
    }

    // Handle different response formats
    // Backend returns: { success: true, data: { data: [...], meta: {...} }, timestamp: "..." }
    // After storiesService.getAll() processing, it should be: { data: [...], meta: {...} }
    const stories = (data as any)?.data || [];
    const meta = (data as any)?.meta;

    // Filter by recommended
    const filteredStories = useMemo(() => {
        let filtered = [...stories];

        if (recommendedFilter !== '') {
            filtered = filtered.filter(story => (story.isRecommended ?? false) === recommendedFilter);
        }

        // Client-side sorting
        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortBy === 'createdAt') {
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
            } else if (sortBy === 'title') {
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
            } else if (sortBy === 'viewCount') {
                aValue = a.viewCount;
                bValue = b.viewCount;
            } else if (sortBy === 'rating') {
                aValue = a.rating;
                bValue = b.rating;
            } else if (sortBy === 'likeCount') {
                aValue = a.likeCount;
                bValue = b.likeCount;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [stories, recommendedFilter, sortBy, sortOrder]);

    const handleToggleRecommended = async (story: Story) => {
        try {
            const currentRecommended = story.isRecommended ?? false;
            await updateMutation.mutateAsync({
                id: story.id,
                data: { isRecommended: !currentRecommended },
            });
            showToast(
                currentRecommended
                    ? 'Đã bỏ đề xuất truyện'
                    : 'Đã thêm truyện vào danh sách đề xuất',
                'success'
            );
            setEditingStory(null);
        } catch (error: any) {
            console.error('Error toggling recommended:', error);
            showToast(
                error?.response?.data?.error || 'Có lỗi xảy ra khi cập nhật',
                'error'
            );
        }
    };

    const handleDelete = async () => {
        if (deletingStory) {
            try {
                await deleteMutation.mutateAsync(deletingStory.id);
                showToast(`Đã xóa truyện "${deletingStory.title}" thành công`, 'success');
                setDeletingStory(null);
                setSelectedStories(new Set());
            } catch (error: any) {
                console.error('Error deleting story:', error);
                showToast(
                    error?.response?.data?.error || 'Có lỗi xảy ra khi xóa truyện',
                    'error'
                );
            }
        }
    };

    const handleBulkToggleRecommended = async () => {
        if (selectedStories.size === 0) {
            showToast('Vui lòng chọn ít nhất một truyện', 'warning');
            return;
        }

        try {
            const promises = Array.from(selectedStories).map((storyId) => {
                const story = stories.find((s: Story) => s.id === storyId);
                if (story) {
                    return updateMutation.mutateAsync({
                        id: storyId,
                        data: { isRecommended: !(story.isRecommended ?? false) },
                    });
                }
            });

            await Promise.all(promises);
            showToast(`Đã cập nhật trạng thái đề xuất cho ${selectedStories.size} truyện`, 'success');
            setSelectedStories(new Set());
        } catch (error: any) {
            console.error('Error bulk toggling recommended:', error);
            showToast(
                error?.response?.data?.error || `Có lỗi xảy ra khi cập nhật ${selectedStories.size} truyện`,
                'error'
            );
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStories.size === 0) {
            showToast('Vui lòng chọn ít nhất một truyện', 'warning');
            return;
        }

        try {
            const promises = Array.from(selectedStories).map((storyId) =>
                deleteMutation.mutateAsync(storyId)
            );

            await Promise.all(promises);
            showToast(`Đã xóa thành công ${selectedStories.size} truyện`, 'success');
            setSelectedStories(new Set());
        } catch (error: any) {
            console.error('Error bulk deleting:', error);
            showToast(
                error?.response?.data?.error || `Có lỗi xảy ra khi xóa ${selectedStories.size} truyện`,
                'error'
            );
        }
    };

    const handleExportExcel = () => {
        if (filteredStories.length === 0) {
            showToast('Không có dữ liệu để xuất', 'warning');
            return;
        }

        try {
            const exportData = filteredStories.map((story, index) => ({
                'STT': index + 1,
                'Tiêu đề': story.title,
                'Tác giả': story.authorName || story.author?.displayName || story.author?.username || 'N/A',
                'Trạng thái': story.status,
                'Đã xuất bản': story.isPublished ? 'Có' : 'Không',
                'Đề xuất': story.isRecommended ? 'Có' : 'Không',
                'Lượt xem': story.viewCount,
                'Lượt thích': story.likeCount,
                'Lượt theo dõi': story.followCount,
                'Đánh giá': story.rating.toFixed(2),
                'Số đánh giá': story.ratingCount,
                'Số chương': story._count?.chapters || 0,
                'Số lượt theo dõi': story._count?.follows || 0,
                'Số lượt yêu thích': story._count?.favorites || 0,
                'Thể loại': story.storyCategories?.map((sc: any) => sc.category.name).join(', ') || '',
                'Ngày tạo': new Date(story.createdAt).toLocaleDateString('vi-VN'),
                'Ngày cập nhật': new Date(story.updatedAt).toLocaleDateString('vi-VN'),
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Truyện');
            XLSX.writeFile(wb, `truyen_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast(`Đã xuất thành công ${filteredStories.length} truyện ra file Excel`, 'success');
        } catch (error: any) {
            console.error('Error exporting Excel:', error);
            showToast('Có lỗi xảy ra khi xuất file Excel', 'error');
        }
    };

    const handleSelectAll = () => {
        if (selectedStories.size === filteredStories.length) {
            setSelectedStories(new Set());
            if (filteredStories.length > 0) {
                showToast('Đã bỏ chọn tất cả', 'info');
            }
        } else {
            setSelectedStories(new Set(filteredStories.map(s => s.id)));
            if (filteredStories.length > 0) {
                showToast(`Đã chọn tất cả ${filteredStories.length} truyện`, 'info');
            }
        }
    };

    const handleSelectStory = (storyId: string) => {
        const newSelected = new Set(selectedStories);
        if (newSelected.has(storyId)) {
            newSelected.delete(storyId);
        } else {
            newSelected.add(storyId);
        }
        setSelectedStories(newSelected);
    };

    const totalPages = meta ? Math.ceil(meta.total / limit) : 1;

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                            Quản lý truyện
                        </h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">
                            Quản lý tất cả truyện trong hệ thống
                        </p>
                    </div>
                    <RefreshButton queryKeys={[['stories']]} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Tổng truyện</div>
                        <div className="text-3xl font-bold text-on-surface mt-2">
                            {meta?.total || 0}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Đã xuất bản</div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                            {stories.filter((s: Story) => s.isPublished).length}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Đề xuất</div>
                        <div className="text-3xl font-bold text-primary mt-2">
                            {stories.filter((s: Story) => s.isRecommended ?? false).length}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Tổng lượt xem</div>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                            {stories.reduce((sum: number, s: Story) => sum + s.viewCount, 0).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="bg-surface-container rounded-lg p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col gap-4">
                        {/* Search and Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <input
                                type="text"
                                placeholder="Tìm kiếm truyện..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as any);
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="DRAFT">Bản nháp</option>
                                <option value="ONGOING">Đang ra</option>
                                <option value="COMPLETED">Hoàn thành</option>
                                <option value="PUBLISHED">Đã xuất bản</option>
                                <option value="ARCHIVED">Lưu trữ</option>
                            </select>
                            <select
                                value={recommendedFilter === '' ? '' : recommendedFilter ? 'true' : 'false'}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setRecommendedFilter(value === '' ? '' : value === 'true');
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="">Tất cả đề xuất</option>
                                <option value="true">Có đề xuất</option>
                                <option value="false">Không đề xuất</option>
                            </select>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [field, order] = e.target.value.split('-');
                                    setSortBy(field as any);
                                    setSortOrder(order as any);
                                }}
                                className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="createdAt-desc">Mới nhất</option>
                                <option value="createdAt-asc">Cũ nhất</option>
                                <option value="title-asc">Tên A-Z</option>
                                <option value="title-desc">Tên Z-A</option>
                                <option value="viewCount-desc">Lượt xem cao</option>
                                <option value="rating-desc">Đánh giá cao</option>
                                <option value="likeCount-desc">Lượt thích cao</option>
                            </select>
                        </div>

                        {/* Bulk Actions */}
                        {selectedStories.size > 0 && (
                            <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    Đã chọn {selectedStories.size} truyện
                                </span>
                                <button
                                    onClick={handleBulkToggleRecommended}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Đổi trạng thái đề xuất
                                </button>
                                <button
                                    onClick={() => setShowBulkDeleteModal(true)}
                                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Xóa đã chọn
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedStories(new Set());
                                        showToast('Đã bỏ chọn tất cả', 'info');
                                    }}
                                    className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Bỏ chọn
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                                Xuất Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stories Table */}
                {isLoading ? (
                    <Loading />
                ) : filteredStories.length === 0 ? (
                    <div className="bg-surface-container rounded-lg p-12 text-center shadow-sm">
                        <p className="text-on-surface-variant">Không tìm thấy truyện nào</p>
                    </div>
                ) : (
                    <div className="bg-surface-container rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-outline-variant">
                                <thead className="bg-surface-container-low">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedStories.size === filteredStories.length && filteredStories.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-outline-variant text-blue-600 focus:ring-primary"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Truyện
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Tác giả
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Thống kê
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Đề xuất
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface-container divide-y divide-outline-variant">
                                    {filteredStories.map((story) => (
                                        <tr key={story.id} className="hover:bg-surface-container-high transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStories.has(story.id)}
                                                    onChange={() => handleSelectStory(story.id)}
                                                    className="rounded border-outline-variant text-blue-600 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    {story.coverImage && (
                                                        <Image
                                                            src={story.coverImage}
                                                            alt={story.title}
                                                            width={48}
                                                            height={64}
                                                            className="rounded object-cover flex-shrink-0"
                                                        />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <Link
                                                            href={`/truyen/${story.slug}`}
                                                            className="text-sm font-medium text-on-surface hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                                                        >
                                                            {story.title}
                                                        </Link>
                                                        <div className="text-xs text-on-surface-variant mt-1 space-y-0.5">
                                                            <div>{story._count?.chapters || 0} chương</div>
                                                            {story.storyCategories && story.storyCategories.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {story.storyCategories.slice(0, 2).map((sc: any) => (
                                                                        <span key={sc.id} className="px-1.5 py-0.5 bg-surface-container-high rounded text-xs">
                                                                            {sc.category.name}
                                                                        </span>
                                                                    ))}
                                                                    {story.storyCategories.length > 2 && (
                                                                        <span className="text-xs text-on-surface-variant">+{story.storyCategories.length - 2}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-on-surface">
                                                {story.authorName || story.author?.displayName || story.author?.username || 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    !story.isPublished
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        : story.status === 'ONGOING'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        : story.status === 'COMPLETED'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : story.status === 'ARCHIVED'
                                                        ? 'bg-surface-container-high text-on-surface'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    }`}>
                                                    {!story.isPublished
                                                        ? 'Bản nháp'
                                                        : story.status === 'ONGOING'
                                                        ? 'Đang ra'
                                                        : story.status === 'COMPLETED'
                                                        ? 'Hoàn thành'
                                                        : story.status === 'ARCHIVED'
                                                        ? 'Lưu trữ'
                                                        : 'Đã xuất bản'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                                                <div className="space-y-1">
                                                    <div>👁️ {story.viewCount.toLocaleString()}</div>
                                                    <div>❤️ {story.likeCount.toLocaleString()}</div>
                                                    <div>⭐ {story.rating.toFixed(1)} ({story.ratingCount})</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleToggleRecommended(story)}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${(story.isRecommended ?? false)
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        : 'bg-surface-container-high text-on-surface'
                                                        }`}
                                                >
                                                    {(story.isRecommended ?? false) ? 'Có' : 'Không'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/truyen/${story.slug}`}
                                                        target="_blank"
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        Xem
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeletingStory(story)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-surface-container-low px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-on-surface-variant">
                                    Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, meta?.total || 0)} / {meta?.total || 0} truyện
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high"
                                    >
                                        Trước
                                    </button>
                                    <span className="px-3 py-2 text-sm text-on-surface-variant">
                                        Trang {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Single Story Modal */}
            {deletingStory && (
                <ConfirmModal
                    isOpen={!!deletingStory}
                    title="Xác nhận xóa truyện"
                    message={`Bạn có chắc muốn xóa truyện "${deletingStory.title}"? Hành động này không thể hoàn tác.`}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    confirmColor="red"
                    onConfirm={async () => { await handleDelete() }}
                    onClose={() => { setDeletingStory(null) }}
                    isLoading={deleteMutation.isPending}
                />
            )}

            {/* Bulk Delete Modal */}
            <ConfirmModal
                isOpen={showBulkDeleteModal}
                title="Xác nhận xóa nhiều truyện"
                message={`Bạn có chắc muốn xóa ${selectedStories.size} truyện đã chọn? Hành động này không thể hoàn tác.`}
                confirmText="Xóa tất cả"
                cancelText="Hủy"
                confirmColor="red"
                onConfirm={() => {
                    handleBulkDelete();
                    setShowBulkDeleteModal(false);
                }}
                onClose={() => setShowBulkDeleteModal(false)}
            />
        </AdminLayout>
    );
}
