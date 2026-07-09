'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { AdSlot } from '@/components/ads/ad-slot';
import { BookCard } from '@/components/books/book-card';
import { Loading } from '@/components/ui/loading';
import { useStories } from '@/lib/api/hooks/use-stories';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { Story } from '@/lib/api/stories.service';
import { ArtTab } from '@/components/art/art-tab';
import { PaintingTab } from '@/components/paintings/painting-tab';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { usePageLimit } from '@/hooks/use-page-limit';

type StoryTab = 'truyen' | 'nghe-thuat' | 'tranh';

function StoriesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();

    // Tab: truyen | nghe-thuat
    const initialTab = (searchParams.get('tab') as StoryTab) || 'truyen';
    const [activeTab, setActiveTab] = useState<StoryTab>(initialTab);

    const handleTabChange = (tab: StoryTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'truyen') params.delete('tab');
        else params.set('tab', tab);
        router.replace(params.toString() ? `/stories?${params.toString()}` : '/stories', { scroll: false });
    };

    // Get initial values from URL params
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    const initialSearch = searchParams.get('search') || '';
    const initialCategory = searchParams.get('category') || '';
    // Empty string means "all statuses" - let backend handle filtering by isPublished=true
    // Don't allow DRAFT status on public page - filter it out
    const urlStatus = searchParams.get('status') || '';
    const initialStatus = urlStatus === 'DRAFT' ? '' : urlStatus;
    const initialSortBy = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating' | 'viewCount') || 'newest';

    // State
    const [page, setPage] = useState(initialPage);
    const [search, setSearch] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [status, setStatus] = useState(initialStatus);
    const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating' | 'viewCount'>(initialSortBy);
    const [showFilters, setShowFilters] = useState(false);

    // Phân trang theo màn hình: xl (lưới 6 cột) 24 truyện/trang = 4 hàng khít,
    // nhỏ hơn (lưới ≤5 cột) 20 truyện/trang.
    const limit = usePageLimit(20, 24);

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
        // Only add status filter if user explicitly selected one and it's not DRAFT
        // DRAFT status should not be accessible on public page
        if (status && status !== 'DRAFT') params.status = status;
        // If no status selected, backend will default to showing all published stories (excluding drafts)

        return params;
    }, [page, limit, search, selectedCategory, status, sortBy]);

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
        // Only add status to URL if user explicitly selected one and it's not DRAFT
        // DRAFT status should not be accessible on public page
        if (status && status !== 'DRAFT') params.set('status', status);
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
        const urlTab = (searchParams.get('tab') as StoryTab) || 'truyen';
        if (urlTab !== activeTab) setActiveTab(urlTab);

        const urlPage = parseInt(searchParams.get('page') || '1', 10);
        const urlSearch = searchParams.get('search') || '';
        const urlCategory = searchParams.get('category') || '';
        const urlStatusParam = searchParams.get('status') || '';
        // Filter out DRAFT status - don't allow it on public page
        const urlStatus = urlStatusParam === 'DRAFT' ? '' : urlStatusParam;
        const urlSortBy = (searchParams.get('sortBy') as 'newest' | 'popular' | 'rating' | 'viewCount') || 'newest';

        if (urlPage !== page) setPage(urlPage);
        if (urlSearch !== search) setSearch(urlSearch);
        if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
        if (urlStatus !== status) setStatus(urlStatus);
        if (urlSortBy !== sortBy) setSortBy(urlSortBy);

        // If URL has DRAFT status, remove it from URL
        if (urlStatusParam === 'DRAFT') {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('status');
            const newUrl = params.toString() ? `/stories?${params.toString()}` : '/stories';
            router.replace(newUrl, { scroll: false });
        }
    }, [searchParams]);

    const handleResetFilters = () => {
        setSearch('');
        setSelectedCategory('');
        setStatus(''); // Empty = show all published stories
        setSortBy('newest');
        setPage(1);
    };

    const totalPages = meta?.totalPages || 1;
    const hasActiveFilters = search || selectedCategory || status || sortBy !== 'newest';

    return (
        <div className="min-h-screen bg-surface transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-60 pb-16 md:pb-0">
                <Header />

                {/* Tab switcher */}
                <div className="sticky top-[60px] z-30 bg-background/90 backdrop-blur-md border-b border-outline-variant/20 px-4 md:px-6">
                    <div className="max-w-7xl mx-auto flex">
                        {(['truyen', 'nghe-thuat', 'tranh'] as StoryTab[]).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? 'border-on-surface text-on-surface'
                                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                {tab === 'truyen' ? '📚 Truyện' : tab === 'nghe-thuat' ? '🎨 Nghệ thuật' : '🖼️ Tranh'}
                            </button>
                        ))}
                    </div>
                </div>

                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">

                        {/* ── Tab Nghệ thuật ─────────────────────────────────── */}
                        {activeTab === 'nghe-thuat' && (
                            <ArtTab currentUserId={user?.id} isLoggedIn={isAuthenticated} />
                        )}

                        {/* ── Tab Tranh ───────────────────────────────────────── */}
                        {activeTab === 'tranh' && (
                            <PaintingTab currentUserId={user?.id} isLoggedIn={isAuthenticated} />
                        )}

                        {/* ── Tab Truyện ─────────────────────────────────────── */}
                        {activeTab === 'truyen' && (<>
                        <AdSlot slotKey="stories.list.top" />
                        {/* Page Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-2">
                                Danh sách truyện
                            </h1>
                            <p className="text-on-surface-variant">
                                Khám phá hàng ngàn truyện đa dạng từ các tác giả trong nước và quốc tế
                            </p>
                        </div>

                        {/* Filters Toggle Button (Mobile) */}
                        <div className="md:hidden mb-4">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg flex items-center justify-between"
                            >
                                <span className="text-on-surface-variant font-medium">
                                    {showFilters ? 'Ẩn bộ lọc' : 'Hiển thị bộ lọc'}
                                </span>
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
                            <div className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-4 md:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-on-surface">Bộ lọc nâng cao</h2>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Search */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Tìm kiếm
                                        </label>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Tên truyện, tác giả, tag..."
                                            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Thể loại
                                        </label>
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
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
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Trạng thái
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
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
                                            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
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
                            <div className="mb-4 text-sm text-on-surface-variant">
                                Hiển thị <span className="font-medium text-on-surface">
                                    {(page - 1) * limit + 1}
                                </span> - <span className="font-medium text-on-surface">
                                    {Math.min(page * limit, meta?.total || 0)}
                                </span> của <span className="font-medium text-on-surface">
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
                                    className="mx-auto h-12 w-12 text-on-surface-variant"
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
                                <h3 className="mt-2 text-sm font-medium text-on-surface">Không tìm thấy truyện</h3>
                                <p className="mt-1 text-sm text-on-surface-variant">
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
                                        <div className="text-sm text-on-surface-variant">
                                            Trang {page} / {totalPages}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(1)}
                                                disabled={page === 1}
                                                className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                            >
                                                Đầu
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
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
                                                            className={`px-3 py-2 text-sm border rounded-lg transition-colors ${page === pageNum
                                                                    ? 'bg-primary text-on-primary border-blue-500'
                                                                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
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
                                                        <span key={pageNum} className="px-3 py-2 text-sm text-on-surface-variant">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                            >
                                                Sau
                                            </button>
                                            <button
                                                onClick={() => setPage(totalPages)}
                                                disabled={page === totalPages}
                                                className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                            >
                                                Cuối
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="mt-8">
                            <AdSlot slotKey="stories.list.bottom" />
                        </div>
                        </>)}
                        {/* ── End Tab Truyện ──────────────────────────────── */}
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
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-on-surface-variant">Đang tải...</p>
                </div>
            </div>
        }>
            <StoriesContent />
        </Suspense>
    );
}
