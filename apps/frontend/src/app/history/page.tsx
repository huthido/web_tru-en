'use client';

import { useState } from 'react';
import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useReadingHistory, useClearHistory } from '@/lib/api/hooks/use-reading-history';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

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

function HistoryContent() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showClearModal, setShowClearModal] = useState(false);
  const { showToast } = useToast();

  const { data: historyData, isLoading } = useReadingHistory({ page, limit });
  const clearHistoryMutation = useClearHistory();

  const history = historyData?.data || [];
  const meta = historyData?.meta;

  const handleClearHistory = async () => {
    try {
      await clearHistoryMutation.mutateAsync();
      showToast('Đã xóa lịch sử đọc thành công', 'success');
      setShowClearModal(false);
    } catch (error) {
      showToast('Có lỗi xảy ra khi xóa lịch sử', 'error');
    }
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
                {!isLoading && history.length > 0 && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      Hiển thị:
                    </label>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-300 cursor-pointer"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      / trang
                    </span>
                    <button
                      onClick={() => setShowClearModal(true)}
                      className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Xóa lịch sử
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                {isLoading
                  ? 'Đang tải...'
                  : `${meta?.total || 0} truyện đã đọc${meta && meta.totalPages > 1 ? ` (Trang ${page}/${meta.totalPages})` : ''}`}
              </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loading />
              </div>
            ) : history.length === 0 ? (
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
                  {history.map((item) => {
                    if (!item.story || !item.chapter) return null;
                    return (
                      <Link
                        key={item.id}
                        href={`/stories/${item.story.slug}/chapters/${item.chapter.slug}`}
                        className="group flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-[1.01]"
                      >
                        {/* Story Cover */}
                        {item.story.coverImage && (
                          <div className="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <OptimizedImage
                              src={item.story.coverImage}
                              alt={item.story.title}
                              fill
                              objectFit="cover"
                              sizes={ImageSizes.bookThumbnail}
                              quality={85}
                              placeholder="blur"
                              className="transition-transform duration-300 group-hover:scale-110"
                            />
                          </div>
                        )}

                        {/* Story Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.story.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {item.chapter.title}
                            </p>
                          </div>

                          {/* Progress Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs md:text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Tiến độ đọc</span>
                              <span className="text-gray-600 dark:text-gray-400">{formatDate(item.lastRead)}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-500 dark:bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${item.storyProgress ?? item.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 text-right">
                              {item.storyProgress ?? item.progress}% hoàn thành
                            </div>
                          </div>
                        </div>

                        {/* Continue Reading Button */}
                        <div className="flex items-center flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.href = `/stories/${item.story!.slug}/chapters/${item.chapter!.slug}`;
                            }}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-300 whitespace-nowrap"
                          >
                            Đọc tiếp
                          </button>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, meta.total)} trong tổng số {meta.total} truyện
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          Đầu
                        </button>
                        <button
                          onClick={() => setPage(page - 1)}
                          disabled={!meta.hasPrev}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          Trước
                        </button>
                        
                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (meta.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= meta.totalPages - 2) {
                              pageNum = meta.totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                                  page === pageNum
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setPage(page + 1)}
                          disabled={!meta.hasNext}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          Sau
                        </button>
                        <button
                          onClick={() => setPage(meta.totalPages)}
                          disabled={page === meta.totalPages}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        >
                          Cuối
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>

      {/* Clear History Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearHistory}
        title="Xóa lịch sử đọc"
        message="Bạn có chắc chắn muốn xóa toàn bộ lịch sử đọc? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="red"
        isLoading={clearHistoryMutation.isPending}
      />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
