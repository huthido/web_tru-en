'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { AdSlot } from '@/components/ads/ad-slot';
import { BookCard } from '@/components/books/book-card';
import { Loading } from '@/components/ui/loading';
import { useStories } from '@/lib/api/hooks/use-stories';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { Story } from '@/lib/api/stories.service';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Get initial values from URL params
    const initialQuery = searchParams.get('q') || '';
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    const initialCategory = searchParams.get('category') || '';
    const initialStatus = searchParams.get('status') || '';
    const initialSortBy = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating' | 'viewCount') || 'newest';

    // State
    const [query, setQuery] = useState(initialQuery);
    const [tempQuery, setTempQuery] = useState(initialQuery); // For input field
    const [page, setPage] = useState(initialPage);
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

        if (query) params.search = query;
        if (selectedCategory) params.categories = [selectedCategory];
        if (status) params.status = status;

        return params;
    }, [page, query, selectedCategory, status, sortBy]);

    // Fetch stories
    const { data: storiesData, isLoading } = useStories(queryParams);
    const stories = storiesData?.data || [];
    const meta = storiesData?.meta;

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (page > 1) params.set('page', page.toString());
        if (selectedCategory) params.set('category', selectedCategory);
        if (status) params.set('status', status);
        if (sortBy !== 'newest') params.set('sortBy', sortBy);

        const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
        router.replace(newUrl, { scroll: false });
    }, [page, query, selectedCategory, status, sortBy, router]);

    // Reset to page 1 when filters change (except page itself)
    useEffect(() => {
        setPage(1);
    }, [query, selectedCategory, status, sortBy]);

    // Sync state with URL params when they change externally
    useEffect(() => {
        const urlQuery = searchParams.get('q') || '';
        const urlPage = parseInt(searchParams.get('page') || '1', 10);
        const urlCategory = searchParams.get('category') || '';
        const urlStatus = searchParams.get('status') || '';
        const urlSortBy = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating' | 'viewCount') || 'newest';

        if (urlQuery !== query) {
            setQuery(urlQuery);
            setTempQuery(urlQuery);
        }
        if (urlPage !== page) setPage(urlPage);
        if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
        if (urlStatus !== status) setStatus(urlStatus);
        if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    }, [searchParams]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = tempQuery.trim();

        // Validate: require at least 2 characters
        if (!trimmed) {
            // Don't do anything if empty
            return;
        }

        if (trimmed.length < 2) {
            // Optionally show a toast or alert
            alert('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm');
            return;
        }

        setQuery(trimmed);
    };

    const handleResetFilters = () => {
        setSelectedCategory('');
        setStatus('');
        setSortBy('newest');
        setPage(1);
    };

    const totalPages = meta?.totalPages || 1;
    const hasActiveFilters = selectedCategory || status || sortBy !== 'newest';

    return (
        <div className="min-h-screen bg-surface transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-60 pb-16 md:pb-0">
                <Header />

                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">
                        <AdSlot slotKey="search.top" />
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">
                                Tìm kiếm truyện
                            </h1>
                            {query ? (
                                <p className="text-on-surface-variant">
                                    Kết quả tìm kiếm cho: <span className="font-semibold text-on-surface">&quot;{query}&quot;</span>
                                </p>
                            ) : (
                                <p className="text-on-surface-variant">
                                    Nhập từ khóa để tìm kiếm truyện
                                </p>
                            )}
                        </div>

                        {/* Search Box */}
                        <div className="mb-6">
                            <form onSubmit={handleSearch} className="relative">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                                    <input
                                        type="text"
                                        value={tempQuery}
                                        onChange={(e) => setTempQuery(e.target.value)}
                                        placeholder="Tìm kiếm truyện theo tên, tác giả, mô tả..."
                                        className="w-full pl-12 pr-24 py-4 text-base border border-outline-variant rounded-xl bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                                    />
                                    {tempQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTempQuery('');
                                                setQuery('');
                                            }}
                                            className="absolute right-20 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-on-surface-variant" />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors shadow-sm"
                                    >
                                        Tìm
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Filters Toggle Button (Mobile) */}
                        <div className="md:hidden mb-4">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg flex items-center justify-between shadow-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-on-surface-variant" />
                                    <span className="text-on-surface-variant font-medium">
                                        {showFilters ? 'Ẩn bộ lọc' : 'Hiển thị bộ lọc'}
                                    </span>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-on-surface-variant transition-transform ${showFilters ? 'rotate-180' : ''}`}
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
                            <div className="bg-surface-container rounded-xl shadow-sm border border-outline-variant p-4 md:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-5 h-5 text-on-surface-variant" />
                                        <h2 className="text-lg font-semibold text-on-surface">Bộ lọc nâng cao</h2>
                                    </div>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="text-sm text-primary hover:underline font-medium"
                                        >
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Thể loại
                                        </label>
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        >
                                            <option value="">Tất cả thể loại</option>
                                            {categories.map((cat: any) => (
                                                <option key={cat.id} value={cat.slug}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Trạng thái
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        >
                                            <option value="">Tất cả trạng thái</option>
                                            <option value="PUBLISHED">Đã xuất bản</option>
                                            <option value="ONGOING">Đang ra</option>
                                            <option value="COMPLETED">Hoàn thành</option>
                                            <option value="ARCHIVED">Lưu trữ</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Sắp xếp theo
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
                        {!isLoading && query && (
                            <div className="mb-4 flex items-center justify-between">
                                <div className="text-sm text-on-surface-variant">
                                    {meta?.total ? (
                                        <>
                                            Hiển thị <span className="font-medium text-on-surface">
                                                {(page - 1) * limit + 1}
                                            </span> - <span className="font-medium text-on-surface">
                                                {Math.min(page * limit, meta.total)}
                                            </span> trong tổng số <span className="font-semibold text-on-surface">
                                                {meta.total}
                                            </span> kết quả
                                        </>
                                    ) : (
                                        <span className="text-on-surface-variant">Không tìm thấy kết quả</span>
                                    )}
                                </div>
                                <Link
                                    href="/stories"
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    Xem tất cả truyện →
                                </Link>
                            </div>
                        )}

                        {/* Results Grid */}
                        {!query ? (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-container-high mb-4">
                                    <Search className="w-10 h-10 text-on-surface-variant" />
                                </div>
                                <h3 className="text-xl font-semibold text-on-surface mb-2">
                                    Bắt đầu tìm kiếm
                                </h3>
                                <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
                                    Nhập từ khóa vào ô tìm kiếm bên trên để khám phá hàng ngàn truyện hấp dẫn
                                </p>
                                <Link
                                    href="/stories"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors shadow-sm"
                                >
                                    Khám phá tất cả truyện
                                </Link>
                            </div>
                        ) : isLoading ? (
                            <Loading />
                        ) : stories.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-container-high mb-4">
                                    <svg
                                        className="w-10 h-10 text-on-surface-variant"
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
                                </div>
                                <h3 className="text-xl font-semibold text-on-surface mb-2">
                                    Không tìm thấy kết quả
                                </h3>
                                <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
                                    Không tìm thấy truyện nào phù hợp với từ khóa &quot;{query}&quot;. Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc.
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => {
                                            setTempQuery('');
                                            setQuery('');
                                        }}
                                        className="px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-medium transition-colors"
                                    >
                                        Xóa tìm kiếm
                                    </button>
                                    <Link
                                        href="/stories"
                                        className="px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors shadow-sm"
                                    >
                                        Xem tất cả truyện
                                    </Link>
                                </div>
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
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container rounded-xl p-4 shadow-sm border border-outline-variant">
                                        <div className="text-sm text-on-surface-variant">
                                            Trang <span className="font-semibold text-on-surface">{page}</span> / <span className="font-semibold text-on-surface">{totalPages}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(1)}
                                                disabled={page === 1}
                                                className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors font-medium"
                                            >
                                                Đầu
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="p-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-primary rounded-lg font-semibold text-sm">
                                                {page}
                                            </div>
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page >= totalPages}
                                                className="p-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setPage(totalPages)}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors font-medium"
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

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-on-surface-variant">Đang tải...</p>
                </div>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
