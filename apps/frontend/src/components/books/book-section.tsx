'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { BookCard } from './book-card';
import { BookCardSkeleton } from '@/components/ui/loading';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  viewCount: number;
  rating?: number;
  ratingCount?: number;
  coverImage?: string | null;
  slug?: string;
  storyId?: string;
}

interface BookSectionProps {
  title: string;
  books: Book[];
  seeMoreLink?: string;
  showLikeButton?: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  skeletonCount?: number;
}

export function BookSection({
  title,
  books,
  seeMoreLink = '#',
  showLikeButton = true,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  skeletonCount = 6
}: BookSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Update scroll indicators
  const updateScrollIndicators = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScroll - 1); // -1 for floating point precision

    // Calculate scroll progress (0-100)
    const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
    setScrollProgress(progress);
  }, []);

  // Intersection Observer for animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  // Update scroll indicators on mount and scroll
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    updateScrollIndicators();

    const container = scrollContainerRef.current;
    container.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);

    return () => {
      container.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators, books.length]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoading) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin: '200px', // Trigger 200px before last card is visible
        threshold: 0.1,
      }
    );

    // Observe the last book card
    const lastCard = container.querySelector('[data-last-card]');
    if (lastCard) {
      observerRef.current.observe(lastCard);
    }

    return () => {
      if (observerRef.current && lastCard) {
        observerRef.current.unobserve(lastCard);
      }
    };
  }, [hasMore, onLoadMore, isLoading, books.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!scrollContainerRef.current || books.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Check if section is visible in viewport
      const sectionElement = ref.current;
      if (!sectionElement) return;

      const rect = sectionElement.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

      // Only handle if section is in viewport and user is not typing in an input
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true';

      if (!isInViewport || isTyping) return;

      const cardWidth = 150 + 16; // card width + gap

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          container.scrollBy({ left: -cardWidth, behavior: 'smooth' });
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          container.scrollBy({ left: cardWidth, behavior: 'smooth' });
          break;
        case 'Home':
          e.preventDefault();
          e.stopPropagation();
          container.scrollTo({ left: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          e.stopPropagation();
          container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [books.length]);

  // Drag to scroll functionality for desktop with smooth animation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    // Only start dragging on left mouse button
    if (e.button !== 0) return;

    setIsDragging(true);
    const rect = scrollContainerRef.current.getBoundingClientRect();
    setStartX(e.pageX - rect.left);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleMouseLeave = () => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
    scrollContainerRef.current.style.userSelect = '';
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(false);
    scrollContainerRef.current.style.cursor = 'grab';
    scrollContainerRef.current.style.userSelect = '';
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only scroll if actively dragging
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = e.pageX - rect.left;
    const walk = (x - startX) * 1.5; // Reduced multiplier for smoother feel

    // Direct scroll update - no animation frame to prevent lag
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Handle wheel scroll (horizontal) - simple and direct
  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return;
    // Check if shift key is pressed or if it's a horizontal scroll
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY || e.deltaX;
      scrollContainerRef.current.scrollLeft += delta;
      updateScrollIndicators();
    }
  };

  // Smooth scroll to next/prev
  const scrollToNext = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const cardWidth = 150 + 16; // card width + gap
    scrollContainerRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
  }, []);

  const scrollToPrev = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const cardWidth = 150 + 16; // card width + gap
    scrollContainerRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={ref}
      className={`mb-12 transition-all duration-700 overflow-x-hidden relative ${isVisible
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-8'
        }`}
      tabIndex={0}
      aria-label={`Section: ${title}`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 px-4 md:px-4 flex-wrap">
        <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex-shrink-0">
          {title}
        </h2>
        {seeMoreLink && (
          <Link
            href={seeMoreLink}
            className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-300 flex-shrink-0 whitespace-nowrap"
          >
            (Xem thêm)
          </Link>
        )}
      </div>

      {/* Scroll Position Indicator */}
      {books.length > 0 && (
        <div className="px-4 md:px-6 lg:px-8 mb-2">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${scrollProgress}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {books.length > 0 && (
        <>
          {/* Previous Button */}
          <button
            onClick={scrollToPrev}
            disabled={!canScrollLeft}
            className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all duration-300 ${canScrollLeft
              ? 'opacity-100 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 cursor-pointer'
              : 'opacity-0 pointer-events-none cursor-not-allowed'
              }`}
            aria-label="Scroll to previous books"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>

          {/* Next Button */}
          <button
            onClick={scrollToNext}
            disabled={!canScrollRight}
            className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg flex items-center justify-center transition-all duration-300 ${canScrollRight
              ? 'opacity-100 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 cursor-pointer'
              : 'opacity-0 pointer-events-none cursor-not-allowed'
              }`}
            aria-label="Scroll to next books"
          >
            <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        </>
      )}

      {/* Loading State */}
      {isLoading && books.length === 0 ? (
        <div className="ml-[16px] md:ml-0 md:px-6 lg:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 md:gap-4 pb-4 min-w-max pr-4 md:pr-6 lg:pr-8">
            {[...Array(skeletonCount)].map((_, index) => (
              <BookCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      ) : books.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className="relative ml-[16px] md:ml-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory touch-pan-x cursor-grab focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onKeyDown={(e) => {
            const container = scrollContainerRef.current;
            if (!container) return;

            const cardWidth = 150 + 16;
            switch (e.key) {
              case 'ArrowLeft':
                e.preventDefault();
                e.stopPropagation();
                container.scrollBy({ left: -cardWidth, behavior: 'smooth' });
                break;
              case 'ArrowRight':
                e.preventDefault();
                e.stopPropagation();
                container.scrollBy({ left: cardWidth, behavior: 'smooth' });
                break;
              case 'Home':
                e.preventDefault();
                e.stopPropagation();
                container.scrollTo({ left: 0, behavior: 'smooth' });
                break;
              case 'End':
                e.preventDefault();
                e.stopPropagation();
                container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
                break;
            }
          }}
          onClick={(e) => {
            // Focus container when clicked to enable keyboard navigation
            if (scrollContainerRef.current && e.target === scrollContainerRef.current) {
              scrollContainerRef.current.focus();
            }
          }}
          tabIndex={0}
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
          }}
          role="region"
          aria-label={`Scrollable book list: ${title}. Use arrow keys to navigate.`}
        >
          <div className="flex gap-3 md:gap-4 pb-4 min-w-max" style={{ touchAction: 'auto' }}>
            {books.map((book, index) => {
              const isLastCard = index === books.length - 1;
              return (
                <div
                  key={book.id}
                  data-last-card={isLastCard ? 'true' : undefined}
                  className="transition-all duration-500 snap-start flex-shrink-0"
                  style={{
                    animationDelay: isVisible ? `${index * 50}ms` : '0ms',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                    touchAction: 'auto',
                  }}
                >
                  <BookCard
                    id={book.id}
                    title={book.title}
                    viewCount={book.viewCount}
                    rating={book.rating}
                    ratingCount={book.ratingCount}
                    coverImage={book.coverImage}
                    slug={book.slug}
                    storyId={book.storyId}
                  />
                </div>
              );
            })}

            {/* Loading more skeleton */}
            {isLoading && hasMore && (
              <>
                {[...Array(3)].map((_, index) => (
                  <div key={`loading-more-${index}`} className="snap-start flex-shrink-0">
                    <BookCardSkeleton />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 md:px-6 ml-0">
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Chưa có sách nào
          </div>
        </div>
      )}
    </section>
  );
}

