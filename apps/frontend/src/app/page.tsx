'use client';

import { lazy, Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { BookSectionSkeleton } from '@/components/ui/loading';
import {
  useNewestStories,
  useBestOfMonth,
  useRecommendedStories,
  useTopRatedStories,
  useMostLikedStories,
} from '@/lib/api/hooks/use-stories';
import { useContinueReading } from '@/lib/api/hooks/use-reading-history';
import { useAuth } from '@/contexts/auth-context';
import { Story } from '@/lib/api/stories.service';

// Lazy load heavy components
const BookSection = lazy(() => import('@/components/books/book-section').then(mod => ({ default: mod.BookSection })));
const ContinueReadingCard = lazy(() => import('@/components/stories/continue-reading-card').then(mod => ({ default: mod.ContinueReadingCard })));

export default function Home() {
  const { user } = useAuth();
  // Fetch all homepage data
  const { data: newestBooks = [], isLoading: isLoadingNewest } = useNewestStories(15);
  const { data: bestOfMonth = [], isLoading: isLoadingBestOfMonth } = useBestOfMonth(15);
  const { data: recommendedBooks = [], isLoading: isLoadingRecommended } = useRecommendedStories(15);
  const { data: topRated = [], isLoading: isLoadingTopRated } = useTopRatedStories(20);
  const { data: mostLiked = [], isLoading: isLoadingMostLiked } = useMostLikedStories(15);
  const { data: continueReading = [], isLoading: isLoadingContinueReading } = useContinueReading(3);

  const isLoading = isLoadingNewest || isLoadingBestOfMonth || isLoadingRecommended || isLoadingTopRated || isLoadingMostLiked;

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

  const newestBooksTransformed = newestBooks.map(transformStoryToBook);
  const bestOfMonthTransformed = bestOfMonth.map(transformStoryToBook);
  const recommendedBooksTransformed = recommendedBooks.map(transformStoryToBook);
  const topRatedTransformed = topRated.map(transformStoryToBook);
  const mostLikedTransformed = mostLiked.map(transformStoryToBook);

  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="md:ml-[120px] pb-16 md:pb-0">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
          {isLoading ? (
            <>
              {/* Loading Skeletons */}
              <BookSectionSkeleton />
              <BookSectionSkeleton />
              <BookSectionSkeleton />
              <BookSectionSkeleton />
              <BookSectionSkeleton />
            </>
          ) : (
            <>
              {/* Continue Reading Section - Only show if user is logged in and has reading history */}
              {user && (isLoadingContinueReading || continueReading.length > 0) && (
                <div className="px-4 md:px-6 mb-8">
                  <div className="mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        Tiếp tục đọc
                      </h2>
                      {continueReading.length > 0 && (
                        <Link
                          href="/history"
                          className="text-sm md:text-base text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors duration-200 flex items-center gap-1 group"
                        >
                          <span>Xem tất cả</span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="group-hover:translate-x-1 transition-transform duration-200"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                    {isLoadingContinueReading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 animate-pulse">
                            <div className="flex gap-4">
                              <div className="w-20 h-28 md:w-24 md:h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
                              <div className="flex-1 space-y-3">
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                <div className="space-y-2">
                                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                  <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : continueReading.length > 0 ? (
                      <Suspense fallback={
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 animate-pulse">
                              <div className="flex gap-4">
                                <div className="w-20 h-28 md:w-24 md:h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
                                <div className="flex-1 space-y-3">
                                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      }>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {continueReading.map((item) => (
                            <ContinueReadingCard key={item.id} history={item} />
                          ))}
                        </div>
                      </Suspense>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Book Sections */}
              <Suspense fallback={<BookSectionSkeleton />}>
                <BookSection title="MỚI NHẤT" books={newestBooksTransformed} seeMoreLink="/stories?sortBy=newest" showLikeButton={false} />
              </Suspense>
              <Suspense fallback={<BookSectionSkeleton />}>
                <BookSection title="SÁCH ĐƯỢC ĐỀ XUẤT" books={recommendedBooksTransformed} seeMoreLink="/stories?sortBy=popular" showLikeButton={false} />
              </Suspense>
              <Suspense fallback={<BookSectionSkeleton />}>
                <BookSection title="TRUYỆN HAY NHẤT THÁNG" books={bestOfMonthTransformed} seeMoreLink="/stories?sortBy=viewCount" showLikeButton={false} />
              </Suspense>
              <Suspense fallback={<BookSectionSkeleton />}>
                <BookSection title="TRUYỆN ĐƯỢC ĐÁNH GIÁ CAO" books={topRatedTransformed} seeMoreLink="/stories?sortBy=rating" showLikeButton={false} />
              </Suspense>
              <Suspense fallback={<BookSectionSkeleton />}>
                <BookSection title="TRUYỆN ĐƯỢC YÊU THÍCH" books={mostLikedTransformed} seeMoreLink="/stories?sortBy=popular" showLikeButton={false} />
              </Suspense>
            </>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
