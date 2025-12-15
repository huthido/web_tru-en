'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { BookCard } from '@/components/books/book-card';
import { Loading, BookCardSkeleton } from '@/components/ui/loading';

interface Book {
  id: string;
  title: string;
  author: string;
  viewCount: number;
  coverImage?: string | null;
  slug?: string;
}

interface BookData {
  books: Book[];
  favorites: string[];
}

export default function FavoritesPage() {
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await fetch('/db.json');
        const data: BookData = await response.json();

        // Map book IDs to book objects
        const bookMap = new Map(data.books.map((book) => [book.id, book]));

        const favorites = data.favorites
          .map((id) => bookMap.get(id))
          .filter((book): book is Book => book !== undefined);

        setFavoriteBooks(favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
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
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Yêu thích
                </h1>
              </div>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 ml-[52px] md:ml-[60px]">
                {isLoading ? 'Đang tải...' : `${favoriteBooks.length} truyện yêu thích`}
              </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <BookCardSkeleton key={index} />
                ))}
              </div>
            ) : favoriteBooks.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 md:py-24">
                <div className="w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400 dark:text-gray-500"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có truyện yêu thích
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Bạn chưa thêm truyện nào vào danh sách yêu thích. Hãy khám phá và thêm những truyện bạn thích nhé!
                </p>
              </div>
            ) : (
              /* Books Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {favoriteBooks.map((book) => (
                  <div key={book.id} className="relative w-[150px]">
                    <BookCard
                      id={book.id}
                      title={book.title}
                      viewCount={book.viewCount}
                      coverImage={book.coverImage}
                      slug={book.slug}
                    />
                    {/* Favorite Badge - positioned on top right of book cover */}
                    <div className="absolute top-2 right-2 z-20 w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center shadow-lg pointer-events-none">
                      <svg
                        width="16"
                        height="16"
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

