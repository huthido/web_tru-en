'use client';

import { lazy, Suspense, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { AdSlot } from '@/components/ads/ad-slot';
import { BookSectionSkeleton } from '@/components/ui/loading';
import {
  useNewestStories,
  useBestOfMonth,
  useRecommendedStories,
  useTopRatedStories,
  useMostLikedStories,
} from '@/lib/api/hooks/use-stories';
import { Story } from '@/lib/api/stories.service';

// Lazy load heavy components
const BookSection = lazy(() => import('@/components/books/book-section').then(mod => ({ default: mod.BookSection })));

// Danh mục trang chủ dạng chip (docs/Fix vài điểm trên app web.pdf) —
// chọn 1 chip hiển thị 1 lưới truyện thay vì 5 section xếp chồng.
const HOME_TABS = [
  { key: 'newest', label: 'Mới nhất', seeMore: '/stories?sortBy=newest' },
  { key: 'bestOfMonth', label: 'Hay nhất tháng', seeMore: '/stories?sortBy=viewCount' },
  { key: 'topRated', label: 'Đánh giá cao', seeMore: '/stories?sortBy=rating' },
  { key: 'recommended', label: 'Đề xuất', seeMore: '/stories?sortBy=popular' },
  { key: 'mostLiked', label: 'Yêu thích', seeMore: '/stories?sortBy=popular' },
] as const;

type HomeTabKey = (typeof HOME_TABS)[number]['key'];

export default function Home() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>('newest');

  // Fetch all homepage data (cache sẵn để chuyển chip không phải chờ).
  const { data: newestBooks = [], isLoading: isLoadingNewest } = useNewestStories(15);
  const { data: bestOfMonth = [], isLoading: isLoadingBestOfMonth } = useBestOfMonth(15);
  const { data: recommendedBooks = [], isLoading: isLoadingRecommended } = useRecommendedStories(15);
  const { data: topRated = [], isLoading: isLoadingTopRated } = useTopRatedStories(20);
  const { data: mostLiked = [], isLoading: isLoadingMostLiked } = useMostLikedStories(15);

  // Transform Story to Book format for BookSection component
  const transformStoryToBook = (story: Story) => ({
    id: story.id,
    title: story.title,
    author: story.authorName || story.author?.displayName || story.author?.username || 'N/A',
    viewCount: story.viewCount || 0,
    rating: story.rating || 0,
    ratingCount: story.ratingCount || 0,
    coverImage: story.coverImage,
    slug: story.slug,
    storyId: story.id,
  });

  const sections: Record<HomeTabKey, { books: ReturnType<typeof transformStoryToBook>[]; isLoading: boolean }> = {
    newest: { books: newestBooks.map(transformStoryToBook), isLoading: isLoadingNewest },
    bestOfMonth: { books: bestOfMonth.map(transformStoryToBook), isLoading: isLoadingBestOfMonth },
    topRated: { books: topRated.map(transformStoryToBook), isLoading: isLoadingTopRated },
    recommended: { books: recommendedBooks.map(transformStoryToBook), isLoading: isLoadingRecommended },
    mostLiked: { books: mostLiked.map(transformStoryToBook), isLoading: isLoadingMostLiked },
  };

  const active = HOME_TABS.find((t) => t.key === activeTab) ?? HOME_TABS[0];
  const { books: activeBooks, isLoading: isLoadingActive } = sections[active.key];

  return (
    <div className="min-h-screen bg-background text-on-surface transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="md:ml-60 pb-16 md:pb-0">
        {/* Header */}
        <Header />

        {/* Chip danh mục — sticky ngay dưới header (đặt ngoài <main> để tránh overflow-x:hidden trên body làm sticky bị nhốt) */}
        <div className="sticky top-[60px] z-30 flex items-center gap-3 bg-background/90 backdrop-blur-md px-4 md:px-6 py-3 border-b border-outline-variant/20">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Danh mục truyện">
            {HOME_TABS.map((tab) => {
              const isActive = tab.key === active.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
                    isActive
                      ? 'bg-on-surface text-surface border-transparent shadow-sm'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/60 hover:bg-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Link
            href={active.seeMore}
            className="hidden sm:block flex-shrink-0 text-xs md:text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Page Content */}
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
          <div className="px-4 md:px-6">
            <AdSlot slotKey="home.top" />
          </div>

          {/* Lưới truyện của danh mục đang chọn */}
          {isLoadingActive ? (
            <BookSectionSkeleton />
          ) : (
            <Suspense fallback={<BookSectionSkeleton />}>
              <BookSection
                title={active.label}
                hideTitle
                books={activeBooks}
                seeMoreLink={active.seeMore}
                showLikeButton={false}
                mobileLimit={12}
              />
            </Suspense>
          )}

          {/* Link Xem tất cả cho mobile (chip row giấu link để đỡ chật) */}
          <div className="sm:hidden px-4 -mt-6 mb-6 text-right">
            <Link href={active.seeMore} className="text-xs font-semibold text-primary hover:underline">
              Xem tất cả →
            </Link>
          </div>

          <div className="px-4 md:px-6 mt-8">
            <AdSlot slotKey="home.bottom" />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
