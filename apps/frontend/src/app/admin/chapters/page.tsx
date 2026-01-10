'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast } from '@/components/ui/toast';
import { LineChart } from '@/components/admin/charts';
import { useAdminChapters, useChaptersStats, useChaptersChartData } from '@/lib/api/hooks/use-chapters';
import { Chapter } from '@/lib/api/chapters.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function AdminChaptersPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPublishedFilter, setIsPublishedFilter] = useState<boolean | ''>('');
    const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'viewCount' | 'order' | 'title'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
    const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);

    const { data, isLoading } = useAdminChapters({
        page,
        limit,
        search: searchTerm || undefined,
        isPublished: isPublishedFilter !== '' ? isPublishedFilter : undefined,
        sortBy,
        sortOrder,
    });

    const { data: stats, isLoading: statsLoading } = useChaptersStats();
    const { data: chartData, isLoading: chartLoading } = useChaptersChartData(30);

    const { toasts, showToast, removeToast } = useToast();

    const chapters = (data as any)?.data || [];
    const meta = (data as any)?.meta;

    const handleSelectAll = () => {
        if (selectedChapters.size === chapters.length) {
            setSelectedChapters(new Set());
        } else {
            setSelectedChapters(new Set(chapters.map((ch: Chapter) => ch.id)));
        }
    };

    const handleSelectChapter = (chapterId: string) => {
        const newSelected = new Set(selectedChapters);
        if (newSelected.has(chapterId)) {
            newSelected.delete(chapterId);
        } else {
            newSelected.add(chapterId);
        }
        setSelectedChapters(newSelected);
    };

    const handleExportExcel = () => {
        const exportData = chapters.map((chapter: Chapter) => ({
            'ID': chapter.id,
            'Tiêu đề': chapter.title,
            'Truyện': chapter.story?.title || 'N/A',
            'Thứ tự': chapter.order,
            'Đã publish': chapter.isPublished ? 'Có' : 'Không',
            'Lượt xem': chapter.viewCount,
            'Số từ': chapter.wordCount,
            'Thời gian đọc (phút)': chapter.readingTime,
            'Người tạo': chapter.uploader?.displayName || chapter.uploader?.username || 'N/A',
            'Ngày tạo': new Date(chapter.createdAt).toLocaleDateString('vi-VN'),
            'Ngày cập nhật': new Date(chapter.updatedAt).toLocaleDateString('vi-VN'),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Chapters');
        XLSX.writeFile(wb, `chapters_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Đã xuất file Excel thành công', 'success');
    };

    const handleBulkDelete = async () => {
        if (selectedChapters.size === 0) return;
        // TODO: Implement bulk delete
        showToast('Tính năng đang phát triển', 'info');
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Quản lý chương</h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Quản lý tất cả chương trong hệ thống</p>
                    </div>
                    <RefreshButton queryKeys={[['admin', 'chapters']]} />
                </div>

                {/* Stats */}
                {statsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm animate-pulse">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            </div>
                        ))}
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Tổng chương</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total.toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Đã publish</div>
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.published.toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Bản nháp</div>
                            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.draft.toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Tổng lượt xem</div>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalViews.toLocaleString()}</div>
                        </div>
                    </div>
                ) : null}

                {/* Chart */}
                {chartLoading ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm animate-pulse">
                        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                ) : chartData ? (
                    <LineChart
                        data={chartData.data}
                        labels={chartData.labels}
                        title="Số chương được tạo theo thời gian"
                        color="#ec4899"
                    />
                ) : null}

                {/* Filters and Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tiêu đề..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={isPublishedFilter === '' ? '' : isPublishedFilter ? 'true' : 'false'}
                            onChange={(e) => {
                                setIsPublishedFilter(e.target.value === '' ? '' : e.target.value === 'true');
                                setPage(1);
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="true">Đã publish</option>
                            <option value="false">Bản nháp</option>
                        </select>
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [by, order] = e.target.value.split('-');
                                setSortBy(by as any);
                                setSortOrder(order as 'asc' | 'desc');
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="createdAt-desc">Mới nhất</option>
                            <option value="createdAt-asc">Cũ nhất</option>
                            <option value="viewCount-desc">Lượt xem cao nhất</option>
                            <option value="viewCount-asc">Lượt xem thấp nhất</option>
                            <option value="title-asc">Tiêu đề A-Z</option>
                            <option value="title-desc">Tiêu đề Z-A</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedChapters.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                                Xóa đã chọn ({selectedChapters.size})
                            </button>
                        )}
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                            Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <Loading />
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedChapters.size === chapters.length && chapters.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tiêu đề</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Truyện</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thứ tự</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lượt xem</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ngày tạo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {chapters.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Không có chương nào
                                            </td>
                                        </tr>
                                    ) : (
                                        chapters.map((chapter: Chapter) => (
                                            <tr key={chapter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChapters.has(chapter.id)}
                                                        onChange={() => handleSelectChapter(chapter.id)}
                                                        className="rounded border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-white">{chapter.title}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{chapter.slug}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {chapter.story ? (
                                                        <Link
                                                            href={`/truyen/${chapter.story.slug}`}
                                                            className="text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            {chapter.story.title}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{chapter.order}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${chapter.isPublished
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}>
                                                        {chapter.isPublished ? 'Đã publish' : 'Bản nháp'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-900 dark:text-white">{chapter.viewCount.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(chapter.createdAt).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        {chapter.story && (
                                                            <Link
                                                                href={`/stories/${chapter.story.slug}/chapters/${chapter.slug}`}
                                                                target="_blank"
                                                                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                                            >
                                                                Xem
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => setDeletingChapter(chapter)}
                                                            className="text-red-600 dark:text-red-400 hover:underline text-sm"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {meta && (
                            <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    {/* Left: Items info and limit selector */}
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            Hiển thị <span className="font-medium">{(page - 1) * limit + 1}</span> - <span className="font-medium">{Math.min(page * limit, meta.total)}</span> của <span className="font-medium">{meta.total}</span> chương
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-gray-700 dark:text-gray-300">Hiển thị:</label>
                                            <select
                                                value={limit}
                                                onChange={(e) => {
                                                    setLimit(Number(e.target.value));
                                                    setPage(1);
                                                }}
                                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right: Pagination controls - Only show if more than 1 page */}
                                    {meta.totalPages > 1 && (
                                        <div className="flex items-center gap-2">
                                            {/* First page button */}
                                            <button
                                                onClick={() => setPage(1)}
                                                disabled={page === 1}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                                title="Trang đầu"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                                </svg>
                                            </button>

                                            {/* Previous page button */}
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                            >
                                                Trước
                                            </button>

                                            {/* Page numbers */}
                                            <div className="flex items-center gap-1">
                                                {(() => {
                                                    const pages: (number | string)[] = [];
                                                    const totalPages = meta.totalPages;
                                                    const currentPage = page;

                                                    // Always show first page
                                                    if (totalPages <= 7) {
                                                        // Show all pages if 7 or fewer
                                                        for (let i = 1; i <= totalPages; i++) {
                                                            pages.push(i);
                                                        }
                                                    } else {
                                                        // Show first page
                                                        pages.push(1);

                                                        if (currentPage <= 3) {
                                                            // Near the start
                                                            for (let i = 2; i <= 4; i++) {
                                                                pages.push(i);
                                                            }
                                                            pages.push('...');
                                                            pages.push(totalPages);
                                                        } else if (currentPage >= totalPages - 2) {
                                                            // Near the end
                                                            pages.push('...');
                                                            for (let i = totalPages - 3; i <= totalPages; i++) {
                                                                pages.push(i);
                                                            }
                                                        } else {
                                                            // In the middle
                                                            pages.push('...');
                                                            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                                                pages.push(i);
                                                            }
                                                            pages.push('...');
                                                            pages.push(totalPages);
                                                        }
                                                    }

                                                    return pages.map((p, idx) => {
                                                        if (p === '...') {
                                                            return (
                                                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-500 dark:text-gray-400">
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                        const pageNum = p as number;
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setPage(pageNum)}
                                                                className={`px-3 py-1 min-w-[2.5rem] rounded-lg text-sm font-medium transition-colors ${pageNum === currentPage
                                                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            {/* Next page button */}
                                            <button
                                                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                                                disabled={page === meta.totalPages}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                            >
                                                Sau
                                            </button>

                                            {/* Last page button */}
                                            <button
                                                onClick={() => setPage(meta.totalPages)}
                                                disabled={page === meta.totalPages}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                                title="Trang cuối"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deletingChapter && (
                    <ConfirmModal
                        isOpen={!!deletingChapter}
                        onClose={() => setDeletingChapter(null)}
                        onConfirm={async () => {
                            // TODO: Implement delete
                            showToast('Tính năng đang phát triển', 'info');
                            setDeletingChapter(null);
                        }}
                        title="Xóa chương"
                        message={`Bạn có chắc chắn muốn xóa chương "${deletingChapter.title}"?`}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
