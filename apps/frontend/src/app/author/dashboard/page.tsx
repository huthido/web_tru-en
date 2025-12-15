'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useMyStories, useDeleteStory, usePublishStory } from '@/lib/api/hooks/use-stories';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Story } from '@/lib/api/stories.service';

export default function AuthorDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('');
    const { data, isLoading, error } = useMyStories({ 
        page, 
        limit: 10,
        search: search || undefined,
        status: status || undefined,
    });
    const deleteMutation = useDeleteStory();
    const publishMutation = usePublishStory();

    const stories: Story[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    const meta = data?.meta;

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa truyện "${title}"?`)) {
            return;
        }
        try {
            await deleteMutation.mutateAsync(id);
        } catch (error) {
            console.error('Error deleting story:', error);
        }
    };

    const handlePublish = async (id: string) => {
        try {
            await publishMutation.mutateAsync(id);
        } catch (error) {
            console.error('Error publishing story:', error);
        }
    };

    // Check if user is author or admin
    const isAuthorOrAdmin = user && (user.role === 'AUTHOR' || user.role === 'ADMIN');

    if (!isAuthenticated) {
        return <ProtectedRoute><div /></ProtectedRoute>;
    }

    if (!isAuthorOrAdmin) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                    <Sidebar />
                    <div className="md:ml-[120px] pb-16 md:pb-0">
                        <Header />
                        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                    Không có quyền truy cập
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Bạn cần có quyền tác giả hoặc quản trị viên để truy cập trang này.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

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
                                    Quản lý truyện của tôi
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Tổng số: {meta?.total || 0} truyện
                                </p>
                            </div>
                            <Link
                                href="/author/stories/create"
                                className="mt-4 md:mt-0 px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
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
                                Tạo truyện mới
                            </Link>
                        </div>

                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 mb-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tìm kiếm
                                    </label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1); // Reset to page 1 when searching
                                        }}
                                        placeholder="Tìm theo tiêu đề, mô tả..."
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                {/* Status Filter */}
                                <div className="md:w-48">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            setStatus(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="DRAFT">Bản nháp</option>
                                        <option value="PUBLISHED">Đã xuất bản</option>
                                        <option value="ARCHIVED">Đã lưu trữ</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Stories List */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loading />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-500 dark:text-red-400">Có lỗi xảy ra khi tải danh sách truyện</p>
                            </div>
                        ) : stories.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Bạn chưa có truyện nào</p>
                                <Link
                                    href="/author/stories/create"
                                    className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Tạo truyện đầu tiên
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {stories.map((story) => (
                                            <div
                                                key={story.id}
                                                className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                    {/* Cover Image */}
                                                    {story.coverImage && (
                                                        <Link
                                                            href={`/books/${story.slug}`}
                                                            className="flex-shrink-0 w-24 h-32 md:w-32 md:h-40 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
                                                        >
                                                            <img
                                                                src={story.coverImage}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </Link>
                                                    )}

                                                    {/* Story Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <Link
                                                            href={`/books/${story.slug}`}
                                                            className="block mb-2"
                                                        >
                                                            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                                                                {story.title}
                                                            </h3>
                                                        </Link>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                                            {story.description || 'Chưa có mô tả'}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                            <span>Lượt xem: {story.viewCount.toLocaleString()}</span>
                                                            <span>•</span>
                                                            <span>Đánh giá: {story.rating.toFixed(1)} ({story.ratingCount})</span>
                                                            <span>•</span>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${story.isPublished
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                }`}>
                                                                {story.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                                        <Link
                                                            href={`/author/stories/${story.slug}/chapters`}
                                                            className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium transition-colors text-center"
                                                        >
                                                            Quản lý chương
                                                        </Link>
                                                        <Link
                                                            href={`/author/stories/${story.id}/edit`}
                                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors text-center"
                                                        >
                                                            Chỉnh sửa
                                                        </Link>
                                                        {!story.isPublished && (
                                                            <button
                                                                onClick={() => handlePublish(story.id)}
                                                                disabled={publishMutation.isPending}
                                                                className="px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                            >
                                                                {publishMutation.isPending ? 'Đang xử lý...' : 'Xuất bản'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(story.id, story.title)}
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
                                {meta && meta.totalPages > 1 && (
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Trước
                                        </button>
                                        <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            Trang {page} / {meta.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(page + 1)}
                                            disabled={page >= meta.totalPages}
                                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
                <Footer />
            </div>
        </div>
        </ProtectedRoute>
    );
}

