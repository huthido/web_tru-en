'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import Link from 'next/link';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useStory, useSimilarStories } from '@/lib/api/hooks/use-stories';
import { useStories } from '@/lib/api/hooks/use-stories';
import { useChapters } from '@/lib/api/hooks/use-chapters';
import { Story } from '@/lib/api/stories.service';
import { FollowButton } from '@/components/stories/follow-button';
import { LikeButton } from '@/components/stories/like-button';
import { CommentSection } from '@/components/comments/comment-section';
import { StarRating } from '@/components/stories/star-rating';
import { PopupSupportContent } from '@/components/pages/popup-support-content';
import { ArrowLeft, BookOpen, HeartHandshake, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { data: storyResponse, isLoading } = useStory(slug);
  // storyResponse is already the Story object (not wrapped in data)
  const story = storyResponse as Story | undefined;

  // Fetch chapters separately since API doesn't include them in story response
  const { data: chaptersResponse, isLoading: chaptersLoading } = useChapters(slug);
  const chapters = Array.isArray(chaptersResponse)
    ? chaptersResponse
    : (Array.isArray((chaptersResponse as any)?.data)
      ? (chaptersResponse as any).data
      : []);

  // Get back URL - always go to parent page (home page)
  // Except if coming from author edit context
  const getBackUrl = () => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      // If coming from author edit context, go back to chapter management
      if (referrer.includes('/author/stories/') && referrer.includes('/chapters/') && referrer.includes('/edit')) {
        // Extract story slug from referrer
        const match = referrer.match(/\/author\/stories\/([^/]+)\/chapters/);
        if (match && match[1]) {
          return `/author/stories/${match[1]}/chapters`;
        }
      }
      // If coming from chapter management page, go back there
      if (referrer.includes('/author/stories/') && referrer.includes('/chapters') && !referrer.includes('/edit') && !referrer.includes('/create')) {
        return referrer;
      }
    }
    // Always return to home page (parent page)
    return '/';
  };

  const handleBack = () => {
    const backUrl = getBackUrl();
    router.push(backUrl);
  };

  const { showToast } = useToast();

  const handleShare = async () => {
    const storyUrl = `${window.location.origin}/truyen/${story?.slug}`;
    const shareData = {
      title: story?.title || 'Truyện',
      text: story?.description || `Đọc truyện ${story?.title}`,
      url: storyUrl,
    };

    try {
      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(storyUrl);
        showToast('Đã sao chép link vào clipboard!', 'success');
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(storyUrl);
          showToast('Đã sao chép link vào clipboard!', 'success');
        } catch (clipboardError) {
          showToast('Không thể chia sẻ. Vui lòng thử lại!', 'error');
        }
      }
    }
  };

  // Get similar stories using the new API
  const { data: similarStoriesData } = useSimilarStories(story?.id || '', 10);

  // Get stories with same categories as fallback
  const categoryIds = useMemo(() => {
    return story?.storyCategories?.map((sc: any) => sc.category?.id).filter(Boolean) || [];
  }, [story?.storyCategories]);

  const { data: sameCategoryStoriesData } = useStories({
    page: 1,
    limit: 10,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
  });

  const sameCategoryStories: Story[] = useMemo(() => {
    const stories = Array.isArray(sameCategoryStoriesData)
      ? sameCategoryStoriesData
      : (Array.isArray((sameCategoryStoriesData as any)?.data)
        ? (sameCategoryStoriesData as any).data
        : []);
    return stories.filter((s: Story) => s.id !== story?.id).slice(0, 10);
  }, [sameCategoryStoriesData, story?.id]);

  // Combine similar stories and same category stories
  const similarStories: Story[] = useMemo(() => {
    // First try similar stories from API
    if (similarStoriesData && Array.isArray(similarStoriesData) && similarStoriesData.length > 0) {
      return similarStoriesData;
    }
    // Fallback to same category stories
    if (sameCategoryStories.length > 0) {
      return sameCategoryStories;
    }
    return [];
  }, [similarStoriesData, sameCategoryStories]);

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Pagination state for chapters
  const [chaptersPage, setChaptersPage] = useState(1);
  const [chaptersPerPage, setChaptersPerPage] = useState(3);

  // Related books scroll refs and state
  const relatedBooksScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingRelated, setIsDraggingRelated] = useState(false);
  const [startXRelated, setStartXRelated] = useState(0);
  const [scrollLeftRelated, setScrollLeftRelated] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset to page 1 when chaptersPerPage changes
  useEffect(() => {
    setChaptersPage(1);
  }, [chaptersPerPage]);

  // Calculate pagination for chapters
  const totalChapters = chapters?.length || 0;
  const totalPages = Math.ceil(totalChapters / chaptersPerPage);
  const startIndex = (chaptersPage - 1) * chaptersPerPage;
  const endIndex = startIndex + chaptersPerPage;
  const displayedChapters = chapters?.slice(startIndex, endIndex) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-[120px]">
          <Header />
          <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
            <Loading message="Đang tải thông tin sách..." />
          </div>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-[120px]">
          <Header />
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Không tìm thấy sách</h1>
            <Link
              href="/"
              className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderStars = (rating: number = 0) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={i <= rating ? 'currentColor' : 'none'}
          className={i <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return stars;
  };

  // Related books drag-to-scroll handlers
  const handleRelatedMouseDown = (e: React.MouseEvent) => {
    if (!relatedBooksScrollRef.current) return;
    if (e.button !== 0) return;

    setIsDraggingRelated(true);
    const rect = relatedBooksScrollRef.current.getBoundingClientRect();
    setStartXRelated(e.pageX - rect.left);
    setScrollLeftRelated(relatedBooksScrollRef.current.scrollLeft);
    relatedBooksScrollRef.current.style.cursor = 'grabbing';
    relatedBooksScrollRef.current.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleRelatedMouseLeave = () => {
    if (!relatedBooksScrollRef.current) return;
    setIsDraggingRelated(false);
    relatedBooksScrollRef.current.style.cursor = 'grab';
    relatedBooksScrollRef.current.style.userSelect = '';
  };

  const handleRelatedMouseUp = (e: React.MouseEvent) => {
    if (!relatedBooksScrollRef.current) return;
    setIsDraggingRelated(false);
    relatedBooksScrollRef.current.style.cursor = 'grab';
    relatedBooksScrollRef.current.style.userSelect = '';
    e.preventDefault();
  };

  const handleRelatedMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRelated || !relatedBooksScrollRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = relatedBooksScrollRef.current.getBoundingClientRect();
    const x = e.pageX - rect.left;
    const walk = (x - startXRelated) * 1.5;

    relatedBooksScrollRef.current.scrollLeft = scrollLeftRelated - walk;
  };

  const handleRelatedWheel = (e: React.WheelEvent) => {
    if (!relatedBooksScrollRef.current) return;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY || e.deltaX;
      relatedBooksScrollRef.current.scrollLeft += delta;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />

      <div className="md:ml-[120px]">
        <Header />

        <main className="pt-8 pb-12 px-4 md:px-6 max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 mb-6 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 group"
          >
            <ArrowLeft
              size={20}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            <span className="text-sm font-medium">Trở lại</span>
          </button>

          {/* Book Detail Content */}
          <div
            className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-12 transition-all duration-700 w-full"
            style={{
              animation: 'fadeIn 0.6s ease-out',
            }}
          >
            {/* Left: Book Cover */}
            <div className="flex-shrink-0 w-full max-w-[300px] mx-auto lg:mx-0 lg:w-[300px] xl:w-[400px]">
              <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-xl group cursor-pointer transition-all duration-500 hover:shadow-2xl">
                {story.coverImage ? (
                  <OptimizedImage
                    src={story.coverImage}
                    alt={story.title}
                    fill
                    className="transition-transform duration-500 group-hover:scale-110"
                    sizes={ImageSizes.bookDetail}
                    objectFit="cover"
                    quality={90}
                    placeholder="blur"
                    priority
                    unoptimized={shouldUnoptimizeImage(story.coverImage)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="text-gray-400">
                      <path
                        d="M50 5L50 55L30 45.3594L10 55L10 5L50 5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Book Information */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 transition-colors duration-300 line-clamp-2">
                {story.title}
              </h1>

              {/* Rating and Stats */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {story.rating?.toFixed(1) || 0}
                  </span>
                  <div className="flex items-center gap-1">{renderStars(story.rating || 0)}</div>
                </div>
                <span className="text-gray-700 dark:text-gray-300">
                  {story.ratingCount || 0} đánh giá
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  {formatViewCount(story.viewCount || 0)} lượt xem
                </span>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8 xl:gap-12 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-300 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tác giả</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {story.authorName || story.author?.displayName || story.author?.username || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Thể loại</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {(story as any).storyCategories && (story as any).storyCategories.length > 0
                      ? (story as any).storyCategories.map((sc: any) => sc.category?.name || sc.name).join(', ')
                      : (story as any).storyTags && (story as any).storyTags.length > 0
                        ? (story as any).storyTags.map((st: any) => st.tag?.name || st.name).join(', ')
                        : story.tags && story.tags.length > 0
                          ? story.tags.join(', ')
                          : 'Chưa phân loại'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Quốc gia</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {story.country || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Trạng thái</p>
                  <p className={`text-base font-medium ${
                    !story.isPublished
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : story.status === 'ONGOING'
                      ? 'text-blue-600 dark:text-blue-400'
                      : story.status === 'COMPLETED'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {!story.isPublished
                      ? 'Bản nháp'
                      : story.status === 'ONGOING'
                      ? 'Đang ra'
                      : story.status === 'COMPLETED'
                      ? 'Hoàn thành'
                      : story.status === 'ARCHIVED'
                      ? 'Lưu trữ'
                      : 'Đã xuất bản'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 md:mb-8">
                {chapters && chapters.length > 0 ? (
                  <Link
                    href={`/stories/${story.slug}/chapters/${chapters[0].slug}`}
                    className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <BookOpen size={20} className="md:w-6 md:h-6" />
                    <span>Đọc truyện</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm md:text-base font-medium cursor-not-allowed"
                  >
                    <BookOpen size={20} className="md:w-6 md:h-6" />
                    <span>Chưa có chương</span>
                  </button>
                )}

                {/* Follow Button */}
                <FollowButton storyId={story.id} showText={false} className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] p-0 flex items-center justify-center" />

                {/* Like Button */}
                <LikeButton storyId={story.id} likeCount={story.likeCount} showCount={false} className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] p-0 flex items-center justify-center" />

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] flex items-center justify-center bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                  aria-label="Chia sẻ"
                >
                  <Share2 size={20} className="md:w-6 md:h-6" />
                </button>

                <button
                  onClick={() => setShowSupportModal(true)}
                  className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <HeartHandshake size={20} className="md:w-6 md:h-6" />
                  <span className="hidden sm:inline">Ủng hộ làm phim</span>
                  <span className="sm:hidden">Ủng hộ</span>
                </button>
              </div>

              {/* Description */}
              {story.description && (
                <div className="mb-8">
                  <div
                    className={`text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-2 transition-all duration-500 ${showFullDescription ? '' : 'line-clamp-3'
                      }`}
                  >
                    {story.description}
                  </div>
                  {story.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}
                </div>
              )}

              {/* Chapters List */}
              {chaptersLoading ? (
                <div className="mb-8">
                  <div className="flex items-center justify-center py-8">
                    <Loading message="Đang tải danh sách chương..." />
                  </div>
                </div>
              ) : (
                chapters && chapters.length > 0 ? (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Danh sách chương ({totalChapters})
                      </h2>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">
                          Hiển thị:
                        </label>
                        <select
                          value={chaptersPerPage}
                          onChange={(e) => setChaptersPerPage(Number(e.target.value))}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {displayedChapters.map((chapter: any) => (
                          <Link
                            key={chapter.id}
                            href={`/stories/${story.slug}/chapters/${chapter.slug}`}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 group"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {chapter.order || 0}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                                  {chapter.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(chapter.createdAt).toLocaleDateString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200 ml-4"
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Hiển thị {startIndex + 1} - {Math.min(endIndex, totalChapters)} trong tổng số {totalChapters} chương
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setChaptersPage(prev => Math.max(1, prev - 1))}
                            disabled={chaptersPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          >
                            Trước
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => {
                                // Show first page, last page, current page, and pages around current
                                if (page === 1 || page === totalPages) return true;
                                if (Math.abs(page - chaptersPage) <= 1) return true;
                                return false;
                              })
                              .map((page, index, array) => {
                                // Add ellipsis if there's a gap
                                const prevPage = array[index - 1];
                                const showEllipsis = prevPage && page - prevPage > 1;

                                return (
                                  <React.Fragment key={page}>
                                    {showEllipsis && (
                                      <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                                    )}
                                    <button
                                      onClick={() => setChaptersPage(page)}
                                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${chaptersPage === page
                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                      {page}
                                    </button>
                                  </React.Fragment>
                                );
                              })}
                          </div>
                          <button
                            onClick={() => setChaptersPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={chaptersPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      Danh sách chương
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Chưa có chương nào được xuất bản
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Similar Stories Section */}
              {similarStories.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Truyện tương tự
                  </h2>
                  <div
                    ref={relatedBooksScrollRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory touch-pan-x cursor-grab select-none"
                    onMouseDown={handleRelatedMouseDown}
                    onMouseLeave={handleRelatedMouseLeave}
                    onMouseUp={handleRelatedMouseUp}
                    onMouseMove={handleRelatedMouseMove}
                    onWheel={handleRelatedWheel}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollBehavior: 'smooth',
                    }}
                  >
                    <div className="flex gap-4 pb-4 min-w-max" style={{ touchAction: 'auto' }}>
                      {similarStories.map((relatedStory) => (
                        <Link
                          key={relatedStory.id}
                          href={`/truyen/${relatedStory.slug}`}
                          className="group flex-shrink-0 w-[150px] transition-all duration-500 hover:scale-105 active:scale-95 snap-start"
                          style={{ touchAction: 'auto' }}
                        >
                          <div className="flex flex-col gap-2">
                            {/* Book Cover - Fixed size */}
                            <div className="relative w-[150px] h-[200px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md group-hover:shadow-2xl transition-all duration-500">
                              {relatedStory.coverImage ? (
                                <OptimizedImage
                                  src={relatedStory.coverImage}
                                  alt={relatedStory.title}
                                  fill
                                  className="transition-transform duration-500 group-hover:scale-110"
                                  sizes={ImageSizes.bookCard}
                                  objectFit="cover"
                                  quality={85}
                                  placeholder="blur"
                                  unoptimized={shouldUnoptimizeImage(relatedStory.coverImage)}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg
                                    width="60"
                                    height="60"
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
                                  </svg>
                                </div>
                              )}
                            </div>
                            {/* Book Info */}
                            <div className="flex flex-col gap-1 w-[150px]">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
                                {relatedStory.title}
                              </h3>
                              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
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
                                <span>{formatViewCount(relatedStory.viewCount || 0)} lượt xem</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              {story?.id && (
                <div className="mx-auto">
                  <CommentSection storyId={story.id} story={story} />
                </div>
              )}

              {/* Structured Data (JSON-LD) */}
              {story && (
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      '@context': 'https://schema.org',
                      '@type': 'Book',
                      name: story.title,
                      description: story.description || '',
                      image: story.coverImage || '',
                      author: {
                        '@type': 'Person',
                        name: story.authorName || story.author?.displayName || story.author?.username || 'Tác giả',
                      },
                      publisher: {
                        '@type': 'Organization',
                        name: 'Web Truyen Tien Hung',
                      },
                      datePublished: story.createdAt,
                      dateModified: story.updatedAt,
                      inLanguage: 'vi',
                      numberOfPages: story._count?.chapters || 0,
                      aggregateRating: story.ratingCount > 0 ? {
                        '@type': 'AggregateRating',
                        ratingValue: story.rating,
                        ratingCount: story.ratingCount,
                        bestRating: 5,
                        worstRating: 1,
                      } : undefined,
                      genre: story.storyCategories?.map((sc: any) => sc.category?.name).filter(Boolean) || [],
                    }),
                  }}
                />
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Ủng hộ HÙNG YÊU
              </h2>
              <button
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label="Đóng"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-500 dark:text-gray-400"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <PopupSupportContent />

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowSupportModal(false)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

