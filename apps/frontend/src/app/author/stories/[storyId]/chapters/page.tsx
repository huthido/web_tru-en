'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { useChapters, useDeleteChapter, usePublishChapter, useUnpublishChapter } from '@/lib/api/hooks/use-chapters';
import { useStory } from '@/lib/api/hooks/use-stories';
import { useMyApprovals } from '@/lib/api/hooks/use-approvals';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useAuth } from '@/lib/api/hooks/use-auth';

export default function ChapterManagementPage() {
    const params = useParams();
    const router = useRouter();
    const storyIdOrSlug = params.storyId as string;
    const { user } = useAuth();

    // storyId can be either ID or slug - try as slug first
    const { data: story, isLoading: storyLoading } = useStory(storyIdOrSlug);
    const storySlug = story?.slug || storyIdOrSlug;
    const { data: chaptersResponse, isLoading: chaptersLoading } = useChapters(storySlug);

    const deleteMutation = useDeleteChapter(storySlug);
    const publishMutation = usePublishChapter(storySlug);
    const unpublishMutation = useUnpublishChapter(storySlug);
    const { toasts, showToast, removeToast } = useToast();
    
    const isAdmin = user?.role === 'ADMIN';

    // Get approval requests to check story approval status
    const { data: approvalsResponse } = useMyApprovals({ limit: 1000 });
    const approvals = approvalsResponse?.data || [];

    // Check if story has approval request
    const storyApprovalRequest = useMemo(() => {
        if (!story?.id) return null;
        return approvals.find((approval: any) => 
            approval.storyId === story.id && 
            approval.type === 'STORY_PUBLISH'
        );
    }, [approvals, story?.id]);

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
            showToast('Xuất bản chương thành công', 'success');
        } catch (error: any) {
            console.error('Error publishing chapter:', error);
            const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi xuất bản chương';
            showToast(errorMessage, 'error');
        }
    };

    const handleUnpublish = async (id: string) => {
        try {
            await unpublishMutation.mutateAsync(id);
            showToast('Thu hồi chương thành công', 'success');
        } catch (error: any) {
            console.error('Error unpublishing chapter:', error);
            const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi thu hồi chương';
            showToast(errorMessage, 'error');
        }
    };


    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <div className="bg-surface-container rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-outline-variant">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
                                            Quản lý chương
                                        </h1>
                                        {story && (
                                            <p className="text-on-surface-variant">
                                                Truyện: <span className="font-medium text-on-surface">{story.title}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-3 mt-4 md:mt-0">
                                        <Link
                                            href="/author/dashboard"
                                            className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg font-medium transition-colors"
                                        >
                                            Quay lại
                                        </Link>
                                        <Link
                                            href={`/author/stories/${storySlug}/chapters/create`}
                                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
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
                                    </div>
                                </div>
                            </div>

                            {/* Story Not Published Warning */}
                            {story && !story.isPublished && !isAdmin && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                                                Truyện chưa được xuất bản
                                            </h3>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                                                {storyApprovalRequest?.status === 'PENDING' ? (
                                                    <>Truyện của bạn đang chờ phê duyệt. Sau khi truyện được phê duyệt và xuất bản, bạn có thể xuất bản các chương.</>
                                                ) : storyApprovalRequest?.status === 'REJECTED' ? (
                                                    <>Yêu cầu xuất bản truyện đã bị từ chối. Vui lòng chỉnh sửa và gửi lại yêu cầu phê duyệt từ trang Dashboard.</>
                                                ) : (
                                                    <>Bạn cần gửi yêu cầu phê duyệt cho truyện trước. Sau khi truyện được phê duyệt và xuất bản, bạn có thể xuất bản các chương. Vui lòng quay lại Dashboard và gửi yêu cầu phê duyệt.</>
                                                )}
                                            </p>
                                            {!storyApprovalRequest && (
                                                <Link
                                                    href="/author/dashboard"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                                    </svg>
                                                    Quay lại Dashboard để gửi phê duyệt
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="bg-surface-container rounded-lg shadow-sm p-4 mb-6 border border-outline-variant">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Search */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Tìm kiếm
                                        </label>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                                setPage(1);
                                            }}
                                            placeholder="Tìm theo tên..."
                                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>

                                    {/* Sort */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Sắp xếp
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => {
                                                setSortBy(e.target.value as any);
                                                setPage(1);
                                            }}
                                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="order-asc">Thứ tự: Tăng dần</option>
                                            <option value="order-desc">Thứ tự: Giảm dần</option>
                                            <option value="title-asc">Tên: A-Z</option>
                                            <option value="title-desc">Tên: Z-A</option>
                                            <option value="created-desc">Mới nhất</option>
                                            <option value="created-asc">Cũ nhất</option>
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Trạng thái
                                        </label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => {
                                                setStatusFilter(e.target.value as any);
                                                setPage(1);
                                            }}
                                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="all">Tất cả</option>
                                            <option value="published">Đã xuất bản</option>
                                            <option value="draft">Bản nháp</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Results count */}
                                {filteredAndSortedChapters.length > 0 && (
                                    <div className="text-sm text-on-surface-variant mt-4 pt-4 border-t border-outline-variant">
                                        Hiển thị {paginatedChapters.length} / {filteredAndSortedChapters.length} chương
                                        {filteredAndSortedChapters.length !== allChapters.length && ` (lọc từ ${allChapters.length} chương)`}
                                    </div>
                                )}
                            </div>

                            {/* Chapters List */}
                            {(chaptersLoading || storyLoading) ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loading />
                                </div>
                            ) : paginatedChapters.length === 0 ? (
                                <div className="text-center py-12 bg-surface-container rounded-lg">
                                    <p className="text-on-surface-variant mb-4">
                                        {allChapters.length === 0
                                            ? 'Chưa có chương nào'
                                            : 'Không tìm thấy chương nào phù hợp với bộ lọc'}
                                    </p>
                                    {allChapters.length === 0 && (
                                        <Link
                                            href={`/author/stories/${storySlug}/chapters/create`}
                                            className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
                                        >
                                            Tạo chương đầu tiên
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-surface-container rounded-lg shadow-sm overflow-hidden">
                                        <div className="divide-y divide-outline-variant">
                                            {paginatedChapters.map((chapter: any) => (
                                                <div
                                                    key={chapter.id}
                                                    className="p-4 md:p-6 hover:bg-surface-container-high/50 transition-colors"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                        {/* Chapter Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary font-semibold text-sm">
                                                                    {chapter.order || 0}
                                                                </span>
                                                                <h3 className="text-lg md:text-xl font-bold text-on-surface line-clamp-2">
                                                                    {chapter.title}
                                                                </h3>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant ml-11">
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
                                                                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-sm font-medium transition-colors text-center"
                                                            >
                                                                Xem
                                                            </Link>
                                                            <Link
                                                                href={`/author/stories/${storySlug}/chapters/${chapter.id}/edit`}
                                                                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-sm font-medium transition-colors text-center"
                                                            >
                                                                Chỉnh sửa
                                                            </Link>
                                                            {chapter.isPublished ? (
                                                                <button
                                                                    onClick={() => handleUnpublish(chapter.id)}
                                                                    disabled={unpublishMutation.isPending}
                                                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    {unpublishMutation.isPending ? (
                                                                        <>
                                                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Đang thu hồi...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                            </svg>
                                                                            Thu hồi
                                                                        </>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handlePublish(chapter.id)}
                                                                    disabled={publishMutation.isPending || (story && !story.isPublished && !isAdmin)}
                                                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                                    title={story && !story.isPublished && !isAdmin ? 'Truyện cần được xuất bản trước' : ''}
                                                                >
                                                                    {publishMutation.isPending ? (
                                                                        <>
                                                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                            </svg>
                                                                            Đang xử lý...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                            Xuất bản
                                                                        </>
                                                                    )}
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
                                            <div className="text-sm text-on-surface-variant">
                                                Trang {page} / {totalPages} ({filteredAndSortedChapters.length} chương)
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setPage(page - 1)}
                                                    disabled={page === 1}
                                                    className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Trước
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                                        const showPage = p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1);
                                                        if (!showPage) {
                                                            if (p === page - 2 || p === page + 2) {
                                                                return <span key={p} className="px-2 text-on-surface-variant">...</span>;
                                                            }
                                                            return null;
                                                        }
                                                        return (
                                                            <button
                                                                key={p}
                                                                onClick={() => setPage(p)}
                                                                className={`min-w-[40px] px-3 py-2 rounded-lg border transition-colors ${page === p
                                                                    ? 'bg-primary border-primary text-on-primary'
                                                                    : 'border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
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
                                                    className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    confirmColor="red"
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteModal({ isOpen: false, chapterId: '', chapterTitle: '' })}
                />

                {/* Toast Notifications */}
                <ToastContainer toasts={toasts} onClose={removeToast} />
            </div>
        </ProtectedRoute>
    );
}
