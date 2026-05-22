'use client';

import { useState } from 'react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { BookCard } from '@/components/books/book-card';
import { BookCardSkeleton } from '@/components/ui/loading';
import { useLikedStories } from '@/lib/api/hooks/use-stories';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 24;
  const { data: likedData, isLoading, error } = useLikedStories(
    user ? { page, limit } : undefined
  );

  const likedStories = likedData?.data || [];
  const totalPages = likedData?.meta?.totalPages || 1;
  const total = likedData?.meta?.total || 0;

  // Transform Story to Book format for BookCard component
  const transformStoryToBook = (item: any) => {
    const story = item.story || item;
    return {
      id: story.id,
      title: story.title,
      author: story.authorName || story.author?.displayName || story.author?.username || 'N/A',
      viewCount: story.viewCount || 0,
      coverImage: story.coverImage,
      slug: story.slug,
      storyId: story.id,
    };
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-surface transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-[120px] pb-16 md:pb-0">
          <Header />
          <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col items-center justify-center py-16 md:py-24">
                <div className="w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full bg-surface-variant flex items-center justify-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-on-surface-variant"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-on-surface mb-2">
                  Vui lòng đăng nhập
                </h2>
                <p className="text-sm md:text-base text-on-surface-variant text-center max-w-md mb-6">
                  Bạn cần đăng nhập để xem danh sách truyện yêu thích của mình.
                </p>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary font-medium rounded-lg transition-colors"
                >
                  Đăng nhập
                </Link>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" fill="currentColor" />
                  </svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                  Yêu thích
                </h1>
              </div>
              <p className="text-sm md:text-base text-on-surface-variant ml-[52px] md:ml-[60px]">
                {isLoading ? 'Đang tải...' : `${total} truyện yêu thích`}
              </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <BookCardSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="flex flex-col items-center justify-center py-16 md:py-24">
                <div className="w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-500 dark:text-red-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-on-surface mb-2">
                  Có lỗi xảy ra
                </h2>
                <p className="text-sm md:text-base text-on-surface-variant text-center max-w-md">
                  Không thể tải danh sách truyện yêu thích. Vui lòng thử lại sau.
                </p>
              </div>
            ) : likedStories.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 md:py-24">
                <div className="w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full bg-surface-variant flex items-center justify-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-on-surface-variant"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-on-surface mb-2">
                  Chưa có truyện yêu thích
                </h2>
                <p className="text-sm md:text-base text-on-surface-variant text-center max-w-md mb-6">
                  Bạn chưa thêm truyện nào vào danh sách yêu thích. Hãy khám phá và thêm những truyện bạn thích nhé!
                </p>
                <Link
                  href="/"
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary font-medium rounded-lg transition-colors"
                >
                  Khám phá truyện
                </Link>
              </div>
            ) : (
              <>
                {/* Books Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mb-8">
                  {likedStories.map((item: any) => {
                    const book = transformStoryToBook(item);
                    return (
                      <BookCard
                        key={book.id}
                        id={book.id}
                        title={book.title}
                        viewCount={book.viewCount}
                        coverImage={book.coverImage}
                        slug={book.slug}
                        storyId={book.storyId}
                        iconType="like"
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Trước
                    </button>
                    <span className="px-4 py-2 text-sm text-on-surface-variant">
                      Trang {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  );
}
