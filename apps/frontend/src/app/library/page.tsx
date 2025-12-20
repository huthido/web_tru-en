'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useMyFollows } from '@/lib/api/hooks/use-follows';
import { useLikedStories } from '@/lib/api/hooks/use-stories';
import { useReadingHistory } from '@/lib/api/hooks/use-reading-history';
import Link from 'next/link';
import Image from 'next/image';

function LibraryContent() {
  const [activeTab, setActiveTab] = useState<'follows' | 'liked' | 'history'>('follows');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: followsData, isLoading: followsLoading } = useMyFollows({ page, limit });
  const { data: likedData, isLoading: likedLoading } = useLikedStories({ page, limit });
  const { data: historyData, isLoading: historyLoading } = useReadingHistory({ page, limit });

  const follows = followsData?.data || [];
  const liked = likedData?.data || [];
  const history = historyData?.data || [];

  const isLoading = followsLoading || likedLoading || historyLoading;

  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Thư viện của tôi
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Quản lý truyện đang theo dõi, đã thích và lịch sử đọc
              </p>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1 mb-6 shadow-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('follows');
                    setPage(1);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'follows'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Đang theo dõi ({followsData?.meta?.total || 0})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('liked');
                    setPage(1);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'liked'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Đã thích ({likedData?.meta?.total || 0})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('history');
                    setPage(1);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'history'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Lịch sử đọc ({historyData?.meta?.total || 0})
                </button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loading />
              </div>
            ) : (
              <>
                {/* Follows Tab */}
                {activeTab === 'follows' && (
                  <div>
                    {follows.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-sm">
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                        >
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">Bạn chưa theo dõi truyện nào</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {follows.map((follow) => {
                          const story = follow.story;
                          if (!story) return null;
                          return (
                            <Link
                              key={follow.id}
                              href={`/stories/${story.slug}`}
                              className="group relative"
                            >
                              <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                                {story.coverImage ? (
                                  <Image
                                    src={story.coverImage}
                                    alt={story.title}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {story.title}
                              </h3>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Liked Tab */}
                {activeTab === 'liked' && (
                  <div>
                    {liked.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-sm">
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">Bạn chưa thích truyện nào</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {liked.map((item: any) => {
                          const story = item.story;
                          if (!story) return null;
                          return (
                            <Link
                              key={item.id}
                              href={`/stories/${story.slug}`}
                              className="group relative"
                            >
                              <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                                {story.coverImage ? (
                                  <Image
                                    src={story.coverImage}
                                    alt={story.title}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                    </svg>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                                  </svg>
                                </div>
                              </div>
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {story.title}
                              </h3>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div>
                    {history.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow-sm">
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                        >
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">Bạn chưa đọc truyện nào</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {history.map((item) => {
                          if (!item.story || !item.chapter) return null;
                          return (
                            <Link
                              key={item.id}
                              href={`/stories/${item.story.slug}/chapters/${item.chapter.slug}`}
                              className="group flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
                            >
                              {item.story.coverImage && (
                                <div className="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                                  <Image
                                    src={item.story.coverImage}
                                    alt={item.story.title}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    sizes="96px"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {item.story.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {item.chapter.title}
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>Tiến độ</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 dark:bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${item.progress}%` }}
                                    />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  {new Date(item.lastRead).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {((activeTab === 'follows' && followsData?.meta?.totalPages > 1) ||
                  (activeTab === 'liked' && likedData?.meta?.totalPages > 1) ||
                  (activeTab === 'history' && historyData?.meta?.totalPages > 1)) && (
                  <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        Trước
                      </button>
                      <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        Trang {page} /{' '}
                        {activeTab === 'follows'
                          ? followsData?.meta?.totalPages
                          : activeTab === 'liked'
                          ? likedData?.meta?.totalPages
                          : historyData?.meta?.totalPages}
                      </span>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={
                          page >=
                          (activeTab === 'follows'
                            ? followsData?.meta?.totalPages || 1
                            : activeTab === 'liked'
                            ? likedData?.meta?.totalPages || 1
                            : historyData?.meta?.totalPages || 1)
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        Sau
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

export default function LibraryPage() {
  return (
    <ProtectedRoute>
      <LibraryContent />
    </ProtectedRoute>
  );
}

