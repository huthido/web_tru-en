'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useChapters, useDeleteChapter, usePublishChapter } from '@/lib/api/hooks/use-chapters';
import { useStory } from '@/lib/api/hooks/use-stories';
import { ProtectedRoute } from '@/components/layouts/protected-route';

export default function ChapterManagementPage() {
    const params = useParams();
    const router = useRouter();
    const storyIdOrSlug = params.storyId as string;

    // storyId can be either ID or slug - try as slug first
    const { data: story, isLoading: storyLoading } = useStory(storyIdOrSlug);
    const storySlug = story?.slug || storyIdOrSlug;
    const { data: chaptersResponse, isLoading: chaptersLoading } = useChapters(storySlug);

    const deleteMutation = useDeleteChapter(storySlug);
    const publishMutation = usePublishChapter(storySlug);

    // Filters and pagination
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'order-asc' | 'order-desc' | 'title-asc' | 'title-desc' | 'created-asc' | 'created-desc'>('order-asc');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        chapterId: string;
        chapterTitle: string;
    }>({
        isOpen: false,
        chapterId: '',
        chapterTitle: '',
    });

    const allChapters = Array.isArray(chaptersResponse)
        ? chaptersResponse
        : (Array.isArray((chaptersResponse as any)?.data)
            ? (chaptersResponse as any).data
            : []);

    // Filter and sort chapters
    const filteredAndSortedChapters = useMemo(() => {
        let filtered = [...allChapters];

        // Search filter
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter((ch: any) =>
                ch.title.toLowerCase().includes(searchLower) ||
                ch.content?.toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (statusFilter === 'published') {
            filtered = filtered.filter((ch: any) => ch.isPublished);
        } else if (statusFilter === 'draft') {
            filtered = filtered.filter((ch: any) => !ch.isPublished);
        }

        // Sort
        filtered.sort((a: any, b: any) => {
            switch (sortBy) {
                case 'order-asc':
                    return (a.order || 0) - (b.order || 0);
                case 'order-desc':
                    return (b.order || 0) - (a.order || 0);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'created-asc':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'created-desc':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default:
                    return 0;
            }
        });

        return filtered;
    }, [allChapters, search, sortBy, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedChapters.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedChapters = filteredAndSortedChapters.slice(startIndex, endIndex);

    const handleDelete = (id: string, title: string) => {
        setDeleteModal({
            isOpen: true,
            chapterId: id,
            chapterTitle: title,
        });
    };

    const confirmDelete = async () => {
        try {
            await deleteMutation.mutateAsync(deleteModal.chapterId);
            setDeleteModal({ isOpen: false, chapterId: '', chapterTitle: '' });
        } catch (error) {
            console.error('Error deleting chapter:', error);
        }
    };

    const handlePublish = async (id: string) => {
        try {
            await publishMutation.mutateAsync(id);
        } catch (error) {
            console.error('Error publishing chapter:', error);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-[120px] pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        Quản lý chương
                                    </h1>
                                    {story && (
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Truyện: {story.title}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-3 mt-4 md:mt-0">
                                    <Link
                                        href={`/author/stories/${storySlug}/chapters/create`}
                                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        Tạo chương mới
                                    </Link>
                                    <Link
                                        href="/author/dashboard"
                                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        Quay lại
                                    </Link>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 mb-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Search */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Tìm kiếm
                                        </label>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                                setPage(1);
                                            }}
                                            placeholder="Tìm theo tên, nội dung..."
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Sort */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Sắp xếp
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => {
                                                setSortBy(e.target.value as any);
                                                setPage(1);
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="order-asc">Thứ tự: Tăng dần</option>
                                            <option value="order-desc">Thứ tự: Giảm dần</option>
                                            <option value="title-asc">Tên: A-Z</option>
                                            <option value="title-desc">Tên: Z-A</option>
                                            <option value="created-asc">Mới nhất: Cũ → Mới</option>
                                            <option value="created-desc">Mới nhất: Mới → Cũ</option>
                                        </select>
                                    </div>

                                    {/* Status Filter */}
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
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tất cả</option>
                                            <option value="published">Đã xuất bản</option>
                                            <option value="draft">Bản nháp</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Results count */}
                                <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    Hiển thị {paginatedChapters.length} / {filteredAndSortedChapters.length} chương
                                    {filteredAndSortedChapters.length !== allChapters.length && ` (trong tổng ${allChapters.length} chương)`}
                                </div>
                            </div>

                            {/* Chapters List */}
                            {(chaptersLoading || storyLoading) ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loading />
                                </div>
                            ) : paginatedChapters.length === 0 ? (
                                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {allChapters.length === 0
                                            ? 'Chưa có chương nào'
                                            : 'Không tìm thấy chương nào phù hợp với bộ lọc'}
                                    </p>
                                    {allChapters.length === 0 && (
                                        <Link
                                            href={`/author/stories/${storySlug}/chapters/create`}
                                            className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Tạo chương đầu tiên
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {paginatedChapters.map((chapter: any) => (
                                                <div
                                                    key={chapter.id}
                                                    className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                        {/* Chapter Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                                                    {chapter.order || 0}
                                                                </span>
                                                                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                                                                    {chapter.title}
                                                                </h3>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 ml-11">
                                                                <span>Lượt xem: {chapter.viewCount?.toLocaleString() || 0}</span>
                                                                <span>•</span>
                                                                <span>{chapter.wordCount?.toLocaleString() || 0} từ</span>
                                                                <span>•</span>
                                                                <span>Thời gian đọc: {chapter.readingTime || 0} phút</span>
                                                                <span>•</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${chapter.isPublished
                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                    }`}>
                                                                    {chapter.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex flex-col gap-2 md:flex-row md:items-center ml-11 md:ml-0">
                                                            <Link
                                                                href={`/stories/${storySlug}/chapters/${chapter.slug}`}
                                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-center"
                                                            >
                                                                Xem
                                                            </Link>
                                                            <Link
                                                                href={`/author/stories/${storySlug}/chapters/${chapter.id}/edit`}
                                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-center"
                                                            >
                                                                Chỉnh sửa
                                                            </Link>
                                                            {!chapter.isPublished && (
                                                                <button
                                                                    onClick={() => handlePublish(chapter.id)}
                                                                    disabled={publishMutation.isPending}
                                                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    {publishMutation.isPending ? 'Đang xử lý...' : 'Xuất bản'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(chapter.id, chapter.title)}
                                                                disabled={deleteMutation.isPending}
                                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                            >
                                                                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Trang {page} / {totalPages} ({filteredAndSortedChapters.length} chương)
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setPage(page - 1)}
                                                    disabled={page === 1}
                                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Trước
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                                        const showPage = p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1);
                                                        if (!showPage) {
                                                            if (p === page - 2 || p === page + 2) {
                                                                return <span key={p} className="px-2 text-gray-500">...</span>;
                                                            }
                                                            return null;
                                                        }
                                                        return (
                                                            <button
                                                                key={p}
                                                                onClick={() => setPage(p)}
                                                                className={`min-w-[40px] px-3 py-2 rounded-lg border transition-colors ${page === p
                                                                    ? 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white'
                                                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                    }`}
                                                            >
                                                                {p}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <button
                                                    onClick={() => setPage(page + 1)}
                                                    disabled={page >= totalPages}
                                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Sau
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </main>
                    <Footer />
                </div>

                {/* Delete Confirmation Modal */}
                <ConfirmModal
                    isOpen={deleteModal.isOpen}
                    title="Xác nhận xóa chương"
                    message={`Bạn có chắc chắn muốn xóa chương "${deleteModal.chapterTitle}"? Hành động này không thể hoàn tác.`}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal({ isOpen: false, chapterId: '', chapterTitle: '' })}
                />
            </div>
        </ProtectedRoute>
    );
}
