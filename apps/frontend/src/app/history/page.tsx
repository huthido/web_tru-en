'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading, BookCardSkeleton } from '@/components/ui/loading';

interface Book {
  id: string;
  title: string;
  author: string;
  viewCount: number;
  coverImage?: string | null;
  slug?: string;
}

interface ReadingHistoryItem {
  bookId: string;
  lastReadAt: string;
  progress: number;
  chapter: string;
}

interface BookData {
  books: Book[];
  readingHistory: ReadingHistoryItem[];
}

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Hôm nay';
  } else if (diffInDays === 1) {
    return 'Hôm qua';
  } else if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} tuần trước`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} tháng trước`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} năm trước`;
  }
}

const DEFAULT_ITEMS_PER_PAGE = 20;
const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 30, 50];

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<(Book & ReadingHistoryItem)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/db.json');
        const data: BookData = await response.json();

        // Map book IDs to book objects
        const bookMap = new Map(data.books.map((book) => [book.id, book]));

        // Combine history items with book data
        const history = data.readingHistory
          .map((item) => {
            const book = bookMap.get(item.bookId);
            if (book) {
              return { ...book, ...item };
            }
            return null;
          })
          .filter((item): item is Book & ReadingHistoryItem => item !== null)
          // Sort by lastReadAt (most recent first)
          .sort((a, b) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());

        setHistoryItems(history);
      } catch (error) {
        console.error('Error fetching reading history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Pagination calculations
  const totalPages = Math.ceil(historyItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = historyItems.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Lịch sử đọc
                </h1>
                {!isLoading && historyItems.length > 0 && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      Hiển thị:
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-300 cursor-pointer"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      / trang
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                {isLoading
                  ? 'Đang tải...'
                  : `${historyItems.length} truyện đã đọc${totalPages > 1 ? ` (Trang ${currentPage}/${totalPages})` : ''}`}
              </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <BookCardSkeleton />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : historyItems.length === 0 ? (
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
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có lịch sử đọc
                </h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Bạn chưa đọc truyện nào. Hãy bắt đầu đọc để xem lịch sử đọc của bạn tại đây!
                </p>
              </div>
            ) : (
              <>
                {/* History List */}
                <div className="space-y-4">
                  {paginatedItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.slug ? `/books/${item.slug}` : `/books/${item.id}`}
                      className="group flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                    >
                      {/* Book Cover */}
                      <div className="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {item.coverImage ? (
                          <Image
                            src={item.coverImage}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                            sizes="96px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              width="40"
                              height="40"
                              viewBox="0 0 60 60"
                              fill="none"
                              className="text-gray-400 dark:text-gray-500"
                            >
                              <path
                                d="M50 5L50 55L30 45.3594L10 55L10 5L50 5Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M30 5V45.3594"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <div className="flex items-center gap-1">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>{formatViewCount(item.viewCount)} lượt xem</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Info */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{item.chapter}</span>
                            <span className="text-gray-600 dark:text-gray-400">{formatDate(item.lastReadAt)}</span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 dark:bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 text-right">
                            {item.progress}% hoàn thành
                          </div>
                        </div>
                      </div>

                      {/* Continue Reading Button */}
                      <div className="flex items-center flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = item.slug ? `/books/${item.slug}` : `/books/${item.id}`;
                          }}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-300 whitespace-nowrap"
                        >
                          Đọc tiếp
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Hiển thị {startIndex + 1}-{Math.min(endIndex, historyItems.length)} trong tổng số {historyItems.length} truyện
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                        aria-label="Trang trước"
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
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          const showPage =
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1);

                          if (!showPage) {
                            // Show ellipsis
                            if (page === currentPage - 2 || page === currentPage + 2) {
                              return (
                                <span key={page} className="px-2 text-gray-500 dark:text-gray-400">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`min-w-[40px] px-3 py-2 rounded-lg border transition-colors duration-300 ${currentPage === page
                                ? 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              aria-label={`Trang ${page}`}
                              aria-current={currentPage === page ? 'page' : undefined}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                        aria-label="Trang sau"
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
                          <path d="M9 18l6-6-6-6" />
                        </svg>
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

