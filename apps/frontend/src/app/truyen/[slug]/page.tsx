'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import Link from 'next/link';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { AdSlot } from '@/components/ads/ad-slot';
import { Loading } from '@/components/ui/loading';
import { useStory, useSimilarStories } from '@/lib/api/hooks/use-stories';
import { useStories } from '@/lib/api/hooks/use-stories';
import { useChapters } from '@/lib/api/hooks/use-chapters';
import { Story } from '@/lib/api/stories.service';
import { FollowButton } from '@/components/stories/follow-button';
import { LikeButton } from '@/components/stories/like-button';
import { QuickFollowAuthorButton } from '@/components/users/quick-follow-author-button';
import { VerifiedBadge } from '@/components/users/verified-badge';
import { CommentSection } from '@/components/comments/comment-section';
import { StarRating } from '@/components/stories/star-rating';
import { DonateAuthorModal } from '@/components/stories/donate-author-modal';
import { StoryVipBanner } from '@/components/stories/story-vip-banner';
import { ArrowLeft, BookOpen, HeartHandshake, Share2, Megaphone, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { data: storyResponse, isLoading, error: storyError } = useStory(slug);
  // storyResponse is already the Story object (not wrapped in data)
  const story = storyResponse as Story | undefined;
  // 403 = truyện tồn tại nhưng chưa xuất bản (nháp/chờ duyệt) — chỉ tác giả
  // hoặc admin xem được. Tách khỏi 404 để người dùng không tưởng truyện bị mất.
  // Chốt status vào state vì react-query xoá `error` về null trong lúc refetch.
  const [storyErrorStatus, setStoryErrorStatus] = useState<number | null>(null);
  useEffect(() => {
    const status = (storyError as any)?.response?.status;
    if (status) setStoryErrorStatus(status);
  }, [storyError]);
  const isUnpublished = storyErrorStatus === 403;

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
  const [showDonateModal, setShowDonateModal] = useState(false);

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
      <div className="min-h-screen bg-surface transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-60">
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
      <div className="min-h-screen bg-surface transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-60">
          <Header />
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] gap-4 px-4">
            {isUnpublished ? (
              <>
                <Lock size={40} className="text-on-surface-variant" />
                <h1 className="font-display text-2xl font-bold text-on-surface text-center">
                  Truyện chưa được xuất bản
                </h1>
                <p className="text-on-surface-variant text-center max-w-md">
                  Truyện này đang ở chế độ nháp hoặc đang chờ quản trị viên duyệt,
                  nên chưa hiển thị công khai. Nếu bạn là tác giả, hãy đăng nhập để xem truyện của mình.
                </p>
                <div className="flex gap-3">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/truyen/${slug}`)}`}
                    className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/"
                    className="px-6 py-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Về trang chủ
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-on-surface">Không tìm thấy sách</h1>
                <p className="text-on-surface-variant text-center max-w-md">
                  Truyện không tồn tại hoặc đã bị gỡ khỏi hệ thống.
                </p>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Về trang chủ
                </Link>
              </>
            )}
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
          className={i <= rating ? 'text-yellow-500' : 'text-outline-variant'}
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
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />

      <div className="md:ml-60">
        <Header />

        <main className="pt-8 pb-12 px-4 md:px-6 max-w-7xl mx-auto">
          <AdSlot slotKey="stories.detail.top" />
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 mb-6 text-on-surface-variant hover:text-on-surface transition-all duration-300 hover:scale-105 active:scale-95 group"
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
                  <div className="w-full h-full flex items-center justify-center bg-surface-variant">
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="text-on-surface-variant">
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
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-on-surface mb-3 md:mb-4 transition-colors duration-300 line-clamp-2">
                {story.title}
              </h1>

              {/* Rating and Stats */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-on-surface">
                    {story.rating?.toFixed(1) || 0}
                  </span>
                  <div className="flex items-center gap-1">{renderStars(story.rating || 0)}</div>
                </div>
                <span className="text-on-surface-variant">
                  {story.ratingCount || 0} đánh giá
                </span>
                <span className="text-on-surface-variant">
                  {formatViewCount(story.viewCount || 0)} lượt xem
                </span>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8 xl:gap-12 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-outline-variant">
                <div>
                  <p className="text-sm text-on-surface-variant mb-1">Tác giả</p>
                  {story.author?.username ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/u/${story.author.username}`}
                        className="text-base font-medium text-on-surface hover:text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {story.author.displayName || story.author.username}
                        {(story.author as any)?.isVerified && <VerifiedBadge size={14} />}
                      </Link>
                      {story.author.id && (
                        <QuickFollowAuthorButton authorId={story.author.id} compact />
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-on-surface">
                      {story.authorName || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant mb-1">Thể loại</p>
                  <p className="text-base font-medium text-on-surface">
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
                  <p className="text-sm text-on-surface-variant mb-1">Quốc gia</p>
                  <p className="text-base font-medium text-on-surface">
                    {story.country || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant mb-1">Trạng thái</p>
                  <p className={`text-base font-medium ${!story.isPublished
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : story.status === 'ONGOING'
                      ? 'text-primary'
                      : story.status === 'COMPLETED'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-on-surface'
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
                {/* Primary Action - Đọc truyện */}
                {chapters && chapters.length > 0 ? (
                  <Link
                    href={`/stories/${story.slug}/chapters/${chapters[0].slug}`}
                    className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <BookOpen size={20} className="md:w-6 md:h-6" />
                    <span>Đọc truyện</span>
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-surface-variant text-on-surface-variant rounded-lg text-sm md:text-base font-medium cursor-not-allowed"
                  >
                    <BookOpen size={20} className="md:w-6 md:h-6" />
                    <span>Chưa có chương</span>
                  </button>
                )}

                {/* Support Buttons */}
                <button
                  onClick={() => setShowDonateModal(true)}
                  className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-tertiary hover:bg-tertiary/90 text-on-tertiary rounded-lg text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <HeartHandshake size={20} className="md:w-6 md:h-6" />
                  <span className="hidden sm:inline">Ủng hộ tác giả</span>
                  <span className="sm:hidden">Ủng hộ</span>
                </button>

                <Link
                  href="/lien-he-quang-cao"
                  className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-primary-container hover:bg-primary-container/80 text-on-primary-container rounded-lg text-sm md:text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <Megaphone size={20} className="md:w-6 md:h-6" />
                  <span className="hidden sm:inline">Tài trợ quảng cáo</span>
                  <span className="sm:hidden">Tài trợ</span>
                </Link>

                {/* Interaction Buttons */}
                <FollowButton storyId={story.id} showText={false} className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] p-0 flex items-center justify-center" />

                <LikeButton storyId={story.id} likeCount={story.likeCount} showCount={false} className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] p-0 flex items-center justify-center" />

                <button
                  onClick={handleShare}
                  className="w-[44px] h-[44px] md:w-[48px] md:h-[48px] flex items-center justify-center bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                  aria-label="Chia sẻ"
                >
                  <Share2 size={20} className="md:w-6 md:h-6" />
                </button>
              </div>

              {/* VIP whole-story purchase (spec mục 4) */}
              <StoryVipBanner slug={slug} />

              {/* Description */}
              {story.description && (
                <div className="mb-8">
                  <div
                    className={`text-base text-on-surface-variant leading-relaxed mb-2 transition-all duration-500 ${showFullDescription ? '' : 'line-clamp-3'
                      }`}
                  >
                    {story.description}
                  </div>
                  {story.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-primary hover:text-primary/80 font-medium transition-all duration-300 hover:scale-105 active:scale-95"
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
                      <h2 className="font-display text-xl font-bold text-on-surface">
                        Danh sách chương ({totalChapters})
                      </h2>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-on-surface-variant">
                          Hiển thị:
                        </label>
                        <select
                          value={chaptersPerPage}
                          onChange={(e) => setChaptersPerPage(Number(e.target.value))}
                          className="px-3 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-surface-container rounded-lg shadow-sm overflow-hidden">
                      <div className="divide-y divide-outline-variant">
                        {displayedChapters.map((chapter: any) => (
                          <Link
                            key={chapter.id}
                            href={`/stories/${story.slug}/chapters/${chapter.slug}`}
                            className="flex items-center justify-between p-4 hover:bg-surface-container-high/50 transition-colors duration-200 group"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold text-sm">
                                {chapter.order || 0}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-medium text-on-surface group-hover:text-primary transition-colors duration-200 truncate flex items-center gap-2">
                                  <span className="truncate">{chapter.title}</span>
                                  {story.accessType !== 'FREEMIUM' && chapter.price > 0 && (
                                    <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-full px-2 py-0.5" title={`${chapter.price} coin để mở khóa`}>
                                    <Lock size={11} />
                                    {chapter.price}
                                  </span>
                                  )}
                                </h3>
                                <p className="text-sm text-on-surface-variant mt-1">
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
                              className="flex-shrink-0 text-on-surface-variant group-hover:text-primary transition-colors duration-200 ml-4"
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
                        <div className="text-sm text-on-surface-variant">
                          Hiển thị {startIndex + 1} - {Math.min(endIndex, totalChapters)} trong tổng số {totalChapters} chương
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setChaptersPage(prev => Math.max(1, prev - 1))}
                            disabled={chaptersPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
                                      <span className="px-2 text-on-surface-variant">...</span>
                                    )}
                                    <button
                                      onClick={() => setChaptersPage(page)}
                                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${chaptersPage === page
                                        ? 'bg-primary text-on-primary hover:bg-primary/90'
                                        : 'text-on-surface-variant bg-surface-container border border-outline-variant hover:bg-surface-container-high'
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
                            className="px-3 py-1.5 text-sm font-medium text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-8">
                    <h2 className="font-display text-xl font-bold text-on-surface mb-4">
                      Danh sách chương
                    </h2>
                    <div className="bg-surface-container rounded-lg shadow-sm p-8 text-center">
                      <p className="text-on-surface-variant">
                        Chưa có chương nào được xuất bản
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Similar Stories Section */}
              {similarStories.length > 0 && (
                <div className="mt-12">
                  <h2 className="font-display text-xl font-bold text-on-surface mb-4">
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
                            <div className="relative w-[150px] h-[200px] rounded-lg overflow-hidden bg-surface-variant shadow-md group-hover:shadow-2xl transition-all duration-500">
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
                                    className="text-on-surface-variant"
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
                              <h3 className="text-sm font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                                {relatedStory.title}
                              </h3>
                              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
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
                        name: 'YÊU',
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
          <div className="mt-8">
            <AdSlot slotKey="stories.detail.bottom" />
          </div>
        </main>

        <Footer />
      </div>

      {/* Donate Author Modal */}
      <DonateAuthorModal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        authorId={story.authorId}
        authorName={story.authorName || story.author?.displayName || story.author?.username || 'Tác giả'}
        storyId={story.id}
        storyTitle={story.title}
      />
    </div>
  );
}

