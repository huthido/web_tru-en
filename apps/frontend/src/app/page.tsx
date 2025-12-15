'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { BookSection } from '@/components/books/book-section';
import { BookSectionSkeleton } from '@/components/ui/loading';
import {
  useNewestStories,
  useBestOfMonth,
  useRecommendedStories,
  useTopRatedStories,
  useMostLikedStories,
} from '@/lib/api/hooks/use-stories';
import { Story } from '@/lib/api/stories.service';

export default function Home() {
  // Fetch all homepage data
  const { data: newestBooks = [], isLoading: isLoadingNewest } = useNewestStories(15);
  const { data: bestOfMonth = [], isLoading: isLoadingBestOfMonth } = useBestOfMonth(15);
  const { data: recommendedBooks = [], isLoading: isLoadingRecommended } = useRecommendedStories(15);
  const { data: topRated = [], isLoading: isLoadingTopRated } = useTopRatedStories(15);
  const { data: mostLiked = [], isLoading: isLoadingMostLiked } = useMostLikedStories(15);

  const isLoading = isLoadingNewest || isLoadingBestOfMonth || isLoadingRecommended || isLoadingTopRated || isLoadingMostLiked;

  // Transform Story to Book format for BookSection component
  const transformStoryToBook = (story: Story) => ({
    id: story.id,
    title: story.title,
    author: story.authorName || story.author?.displayName || story.author?.username || 'N/A',
    viewCount: story.viewCount || 0,
    coverImage: story.coverImage,
    slug: story.slug,
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
              {/* Book Sections */}
              <BookSection title="MỚI NHẤT" books={newestBooksTransformed} seeMoreLink="/stories?sortBy=newest" />
              <BookSection title="SÁCH ĐƯỢC ĐỀ XUẤT" books={recommendedBooksTransformed} seeMoreLink="/stories?sortBy=popular" />
              <BookSection title="TRUYỆN HAY NHẤT THÁNG" books={bestOfMonthTransformed} seeMoreLink="/stories?sortBy=viewCount" />
              <BookSection title="TRUYỆN ĐƯỢC ĐÁNH GIÁ CAO" books={topRatedTransformed} seeMoreLink="/stories?sortBy=rating" />
              <BookSection title="TRUYỆN ĐƯỢC YÊU THÍCH" books={mostLikedTransformed} seeMoreLink="/stories?sortBy=popular" />
            </>
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
