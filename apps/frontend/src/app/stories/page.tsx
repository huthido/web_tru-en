'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { BookCard } from '@/components/books/book-card';
import { Loading } from '@/components/ui/loading';
import { useStories } from '@/lib/api/hooks/use-stories';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { Story } from '@/lib/api/stories.service';

function StoriesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get initial values from URL params
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    const initialSearch = searchParams.get('search') || '';
    const initialCategory = searchParams.get('category') || '';
    // Default to PUBLISHED if no status in URL
    const initialStatus = searchParams.get('status') || 'PUBLISHED';
    const initialSortBy = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating' | 'viewCount') || 'newest';

    // State
    const [page, setPage] = useState(initialPage);
    const [search, setSearch] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [status, setStatus] = useState(initialStatus);
    const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating' | 'viewCount'>(initialSortBy);
    const [showFilters, setShowFilters] = useState(false);

    const limit = 20;

    // Fetch categories
    const { data: categoriesData } = useCategories();
    const categories = categoriesData || [];

    // Build query params
    const queryParams = useMemo(() => {
        const params: any = {
            page,
            limit,
            sortBy,
        };

        if (search) params.search = search;
        if (selectedCategory) params.categories = [selectedCategory]; // Backend expects slug, not id
        // Always filter by published status for public stories page (default is PUBLISHED)
        params.status = status || 'PUBLISHED';

        return params;
    }, [page, search, selectedCategory, status, sortBy]);

    // Fetch stories
    const { data: storiesData, isLoading } = useStories(queryParams);
    const stories = storiesData?.data || [];
    const meta = storiesData?.meta;

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (search) params.set('search', search);
        if (selectedCategory) params.set('category', selectedCategory);
        // Only add status to URL if it's not the default PUBLISHED
        if (status && status !== 'PUBLISHED') params.set('status', status);
        if (sortBy !== 'newest') params.set('sortBy', sortBy);

        const newUrl = params.toString() ? `/stories?${params.toString()}` : '/stories';
        router.replace(newUrl, { scroll: false });
    }, [page, search, selectedCategory, status, sortBy, router]);

    // Reset to page 1 when filters change (except page itself)
    useEffect(() => {
        setPage(1);
    }, [search, selectedCategory, status, sortBy]);

    // Sync state with URL params when they change externally
    useEffect(() => {
        const urlPage = parseInt(searchParams.get('page') || '1', 10);
        const urlSearch = searchParams.get('search') || '';
        const urlCategory = searchParams.get('category') || '';
        const urlStatus = searchParams.get('status') || '';
        const urlSortBy = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating' | 'viewCount') || 'newest';

        if (urlPage !== page) setPage(urlPage);
        if (urlSearch !== search) setSearch(urlSearch);
        if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
        // Default to PUBLISHED if no status in URL
        const finalStatus = urlStatus || 'PUBLISHED';
        if (finalStatus !== status) setStatus(finalStatus);
        if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    }, [searchParams]);

    const handleResetFilters = () => {
        setSearch('');
        setSelectedCategory('');
        setStatus('PUBLISHED');
        setSortBy('newest');
        setPage(1);
    };

    const totalPages = meta?.totalPages || 1;
    const hasActiveFilters = search || selectedCategory || (status && status !== 'PUBLISHED') || sortBy !== 'newest';

    return (
        <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-[120px] pb-16 md:pb-0">
                <Header />

                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                Danh sách truyện
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                Khám phá hàng ngàn truyện đa dạng từ các tác giả trong nước và quốc tế
                            </p>
                        </div>

                        {/* Filters Toggle Button (Mobile) */}
                        <div className="md:hidden mb-4">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-between"
                            >
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {showFilters ? 'Ẩn bộ lọc' : 'Hiển thị bộ lọc'}
                                </span>
                                <svg
                                    className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Filters Section */}
                        <div className={`${showFilters ? 'block' : 'hidden'} md:block mb-6`}>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bộ lọc nâng cao</h2>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Search */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Tìm kiếm
                                        </label>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Tên truyện, tác giả, tag..."
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Thể loại
                                        </label>
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Tất cả</option>
                                            {categories.map((cat: any) => (
                                                <option key={cat.id} value={cat.slug}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Trạng thái
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="PUBLISHED">Đang phát hành</option>
                                            <option value="COMPLETED">Hoàn thành</option>
                                            <option value="ON_HOLD">Tạm dừng</option>
                                            <option value="DROPPED">Đã hủy</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Sắp xếp theo
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="newest">Mới nhất</option>
                                            <option value="popular">Phổ biến</option>
                                            <option value="viewCount">Lượt xem</option>
                                            <option value="rating">Đánh giá cao</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results Info */}
                        {!isLoading && (
                            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                Hiển thị <span className="font-medium text-gray-900 dark:text-white">
                                    {(page - 1) * limit + 1}
                                </span> - <span className="font-medium text-gray-900 dark:text-white">
                                    {Math.min(page * limit, meta?.total || 0)}
                                </span> của <span className="font-medium text-gray-900 dark:text-white">
                                    {meta?.total || 0}
                                </span> truyện
                            </div>
                        )}

                        {/* Stories Grid */}
                        {isLoading ? (
                            <Loading />
                        ) : stories.length === 0 ? (
                            <div className="text-center py-12">
                                <svg
                                    className="mx-auto h-12 w-12 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Không tìm thấy truyện</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Thử thay đổi bộ lọc để tìm thêm truyện
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mb-8">
                                    {stories.map((story: Story) => (
                                        <BookCard
                                            key={story.id}
                                            id={story.id}
                                            title={story.title}
                                            viewCount={story.viewCount || 0}
                                            coverImage={story.coverImage}
                                            slug={story.slug}
                                            storyId={story.id}
                                            iconType="like"
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            Trang {page} / {totalPages}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(1)}
                                                disabled={page === 1}
                                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Đầu
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Trước
                                            </button>
                                            {Array.from({ length: totalPages }).map((_, i) => {
                                                const pageNum = i + 1;
                                                if (
                                                    totalPages <= 7 ||
                                                    pageNum === 1 ||
                                                    pageNum === totalPages ||
                                                    (pageNum >= page - 2 && pageNum <= page + 2)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setPage(pageNum)}
                                                            className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                                                                page === pageNum
                                                                    ? 'bg-blue-500 text-white border-blue-500'
                                                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                } else if (
                                                    (pageNum === page - 3 && page > 4) ||
                                                    (pageNum === page + 3 && page < totalPages - 3)
                                                ) {
                                                    return (
                                                        <span key={pageNum} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Sau
                                            </button>
                                            <button
                                                onClick={() => setPage(totalPages)}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Cuối
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
        </div>
    );
}

export default function StoriesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
            </div>
        }>
            <StoriesContent />
        </Suspense>
    );
}
