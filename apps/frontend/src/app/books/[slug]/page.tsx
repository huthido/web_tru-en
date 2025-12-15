'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useStory } from '@/lib/api/hooks/use-stories';
import { useStories } from '@/lib/api/hooks/use-stories';
import { useChapters } from '@/lib/api/hooks/use-chapters';
import { Story } from '@/lib/api/stories.service';

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

  // Check if we came from author edit context
  const getBackUrl = () => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      // If coming from edit chapter page, go back to chapter management
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
    return null;
  };

  const handleBack = () => {
    const backUrl = getBackUrl();
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  // Get related stories (same categories) - use useMemo to prevent re-renders
  const categoryIds = useMemo(() => {
    return story?.storyCategories?.map((sc: any) => sc.category?.id).filter(Boolean) || [];
  }, [story?.storyCategories]);

  const { data: relatedStoriesData } = useStories({
    page: 1,
    limit: 5,
    categories: categoryIds.length > 0 ? categoryIds : undefined,
  });

  const relatedStories: Story[] = useMemo(() => {
    const stories = Array.isArray(relatedStoriesData)
      ? relatedStoriesData
      : (Array.isArray((relatedStoriesData as any)?.data)
        ? (relatedStoriesData as any).data
        : []);
    return stories.filter((s: Story) => s.id !== story?.id).slice(0, 5);
  }, [relatedStoriesData, story?.id]);

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [showSupportModal, setShowSupportModal] = useState(false);

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

  const renderStars = (rating: number = 0, interactive = false, onStarClick?: (rating: number) => void) => {
    const stars = [];
    const displayRating = interactive ? (hoveredRating || rating) : rating;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => interactive && onStarClick ? onStarClick(i) : undefined}
          onMouseEnter={() => interactive && setHoveredRating(i)}
          onMouseLeave={() => interactive && setHoveredRating(0)}
          className={interactive ? 'cursor-pointer transition-transform duration-200 hover:scale-125' : ''}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={i <= displayRating ? 'currentColor' : 'none'}
            className={i <= displayRating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      );
    }
    return stars;
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || rating === 0) {
      alert('Vui lòng nhập bình luận và đánh giá!');
      return;
    }
    // TODO: Submit to API
    console.log('Comment:', commentText, 'Rating:', rating);
    alert('Bình luận đã được gửi! (Tính năng đang phát triển)');
    setCommentText('');
    setRating(0);
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="stroke-currentColor transition-transform duration-300 group-hover:-translate-x-1"
              strokeWidth="2"
            >
              <path d="M12.5 15L7.5 10L12.5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
                  <Image
                    src={story.coverImage}
                    unoptimized={story.coverImage.includes('images.unsplash.com') || story.coverImage.includes('cache.staticscdn.net')}
                    alt={story.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 1024px) 100vw, 400px"
                    priority
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
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {story.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
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
                    <svg width="20" height="20" className="md:w-[24px] md:h-[24px] stroke-white" viewBox="0 0 30 30" fill="none" strokeWidth="1.5">
                      <path
                        d="M1.875 5.625L15 3.75L28.125 5.625V15C28.125 20.625 15 26.25 15 26.25C15 26.25 1.875 20.625 1.875 15V5.625Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Đọc truyện</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm md:text-base font-medium cursor-not-allowed"
                  >
                    <svg width="20" height="20" className="md:w-[24px] md:h-[24px] stroke-current" viewBox="0 0 30 30" fill="none" strokeWidth="1.5">
                      <path
                        d="M1.875 5.625L15 3.75L28.125 5.625V15C28.125 20.625 15 26.25 15 26.25C15 26.25 1.875 20.625 1.875 15V5.625Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Chưa có chương</span>
                  </button>
                )}

                <button className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] flex items-center justify-center rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95">
                  <svg
                    width="20"
                    height="20"
                    className="md:w-[24px] md:h-[24px] text-gray-700 dark:text-gray-300"
                    viewBox="0 0 40 40"
                    fill="none"
                  >
                    <path
                      d="M8.75 5L20 3.75L31.25 5V15C31.25 20.625 20 26.25 20 26.25C20 26.25 8.75 20.625 8.75 15V5Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] flex items-center justify-center rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95">
                  <svg
                    width="20"
                    height="20"
                    className="md:w-[24px] md:h-[24px] text-gray-700 dark:text-gray-300"
                    viewBox="0 0 40 40"
                    fill="none"
                  >
                    <path
                      d="M20 8.33333C15.8333 3.33333 8.33333 4.16667 8.33333 12.5C8.33333 20.8333 20 31.6667 20 31.6667C20 31.6667 31.6667 20.8333 31.6667 12.5C31.6667 4.16667 24.1667 3.33333 20 8.33333Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] flex items-center justify-center rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95">
                  <svg
                    width="24"
                    height="24"
                    className="text-gray-700 dark:text-gray-300"
                    viewBox="0 0 40 40"
                    fill="none"
                  >
                    <path
                      d="M3.74474 2.49499L20 18.75L36.2553 2.49499M3.74474 37.505L20 21.25L36.2553 37.505"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => setShowSupportModal(true)}
                  className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <svg width="20" height="20" className="md:w-[24px] md:h-[24px] stroke-white" viewBox="0 0 30 30" fill="none" strokeWidth="1.5">
                    <rect x="1.875" y="5.625" width="26.25" height="22.5" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1.875 11.25H28.125" strokeLinecap="round" />
                  </svg>
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      Danh sách chương ({chapters.length})
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {chapters.map((chapter: any) => (
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

              {/* Comment Form */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Viết bình luận và đánh giá
                </h2>
                <form onSubmit={handleSubmitComment} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Đánh giá của bạn
                    </label>
                    <div className="flex items-center gap-2">
                      {renderStars(rating, true, setRating)}
                      {rating > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                          {rating} / 5 sao
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="comment"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Bình luận
                    </label>
                    <textarea
                      id="comment"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Chia sẻ suy nghĩ của bạn về cuốn sách này..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Gửi bình luận
                  </button>
                </form>
              </div>

              {/* Related Books Section */}
              {relatedStories.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Truyện liên quan
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
                    <div className="flex gap-4 pb-4 min-w-max">
                      {relatedStories.map((relatedStory) => (
                        <Link
                          key={relatedStory.id}
                          href={`/books/${relatedStory.slug}`}
                          className="group flex-shrink-0 w-[150px] transition-all duration-500 hover:scale-105 active:scale-95 snap-start"
                        >
                          <div className="flex flex-col gap-2">
                            {/* Book Cover - Fixed size */}
                            <div className="relative w-[150px] h-[200px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md group-hover:shadow-2xl transition-all duration-500">
                              {relatedStory.coverImage ? (
                                <Image
                                  src={relatedStory.coverImage}
                                  unoptimized={relatedStory.coverImage.includes('images.unsplash.com') || relatedStory.coverImage.includes('cache.staticscdn.net')}
                                  alt={relatedStory.title}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                  sizes="150px"
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
            <div className="px-6 py-6 space-y-6">
              {/* Introduction Text */}
              <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>
                  <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> rất mong nhận được sự ủng hộ từ cộng đồng, doanh nghiệp và những người yêu nghệ thuật để cùng chúng tôi thực hiện các dự án làm phim, viết truyện, sáng tác sách và phát triển nội dung giải trí mang giá trị nhân văn. Mỗi sự ủng hộ của bạn đều là nguồn động viên to lớn, giúp các tác giả và nhà sáng tạo có thêm điều kiện để nuôi dưỡng đam mê và cho ra đời những tác phẩm chất lượng.
                </p>
                <p>
                  Sự đồng hành của bạn không chỉ góp phần phát triển nền tảng <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong>, mà còn chung tay lan tỏa nghệ thuật, cảm xúc và giá trị tinh thần tích cực đến cộng đồng.
                </p>
                <p className="text-center">
                  <span className="text-red-500 text-lg">❤️</span> <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Trân trọng mọi sự ủng hộ, cùng nhau kiến tạo những tác phẩm chạm đến tâm hồn.
                </p>
              </div>

              {/* Support Information Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Thông tin ủng hộ
                </h3>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white p-2">
                    <Image
                      src="/ungho.jpg"
                      alt="Mã QR ủng hộ"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 256px, 320px"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-sm md:text-base text-gray-700 dark:text-gray-300">
                  <p>
                    <strong className="text-gray-900 dark:text-white">Rất mong mọi người ghi rõ Họ và Tên cũng như Biệt Danh</strong>
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-r-lg">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">Lưu ý:</p>
                    <p>Ghi chú ủng hộ vì lý do gì, ủng hộ tác phẩm nào và vì sao</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      (Ví dụ: ủng hộ bộ truyện, phim, sách nào đó để mong phát hành sách hoặc làm phim)
                    </p>
                  </div>
                  <p className="text-center font-semibold text-gray-900 dark:text-white mt-4">
                    Cảm ơn tất cả mọi người.
                  </p>
                </div>
              </div>
            </div>

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

