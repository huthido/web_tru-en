'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { BookCard } from '@/components/books/book-card';
import { BookCardSkeleton } from '@/components/ui/loading';
import { useMyFollows } from '@/lib/api/hooks/use-follows';
import Link from 'next/link';

function FollowsContent() {
  const [page, setPage] = useState(1);
  const limit = 24;
  const { data: followsData, isLoading, error } = useMyFollows({ page, limit });

  const follows = followsData?.data || [];
  const totalPages = followsData?.meta?.totalPages || 1;
  const total = followsData?.meta?.total || 0;

  // Transform Follow to Book format for BookCard component
  const transformFollowToBook = (follow: any) => {
    const story = follow.story;
    if (!story) return null;
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

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
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
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                  Đang theo dõi
                </h1>
              </div>
              <p className="text-sm md:text-base text-on-surface-variant ml-[52px] md:ml-[60px]">
                {isLoading ? 'Đang tải...' : `${total} truyện đang theo dõi`}
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
                  Không thể tải danh sách truyện đang theo dõi. Vui lòng thử lại sau.
                </p>
              </div>
            ) : follows.length === 0 ? (
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
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-on-surface mb-2">
                  Chưa theo dõi truyện nào
                </h2>
                <p className="text-sm md:text-base text-on-surface-variant text-center max-w-md mb-6">
                  Bạn chưa theo dõi truyện nào. Hãy khám phá và theo dõi những truyện bạn muốn đọc tiếp nhé!
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
                  {follows.map((follow: any) => {
                    const book = transformFollowToBook(follow);
                    if (!book) return null;
                    return (
                      <BookCard
                        key={follow.id}
                        id={book.id}
                        title={book.title}
                        viewCount={book.viewCount}
                        coverImage={book.coverImage}
                        slug={book.slug}
                        storyId={book.storyId}
                        iconType="follow"
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

export default function FollowsPage() {
  return (
    <ProtectedRoute>
      <FollowsContent />
    </ProtectedRoute>
  );
}

