'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookCard } from './book-card';
import { BookCardSkeleton } from '@/components/ui/loading';

interface Book {
  id: string;
  title: string;
  author?: string | null;
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
  hideTitle?: boolean;
  /** Số card tối đa hiển thị trên màn hình nhỏ/vừa (dưới breakpoint xl). */
  mobileLimit?: number;
  /** Số card tối đa trên màn hình lớn (xl trở lên, lưới 5 cột). Mặc định bằng mobileLimit. */
  desktopLimit?: number;
}

const GRID = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4';

export function BookSection({
  title,
  books,
  seeMoreLink = '#',
  isLoading = false,
  hasMore = false,
  onLoadMore,
  skeletonCount = 10,
  hideTitle = false,
  mobileLimit = 12,
  desktopLimit = mobileLimit,
}: BookSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fade-in on enter viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoading || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, isLoading]);

  const displayed = books.slice(0, Math.max(mobileLimit, desktopLimit));

  return (
    <section
      ref={sectionRef}
      className={`mb-12 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {!hideTitle && (
        <div className="flex items-center justify-between gap-3 mb-4 px-4 md:px-6">
          <h2 className="text-lg md:text-2xl font-display font-extrabold tracking-tight text-on-surface transition-colors duration-300 md:uppercase">
            {title}
          </h2>
          {seeMoreLink && (
            <Link
              href={seeMoreLink}
              className="text-xs md:text-sm font-semibold text-primary hover:underline transition-colors duration-300 whitespace-nowrap"
            >
              Xem tất cả →
            </Link>
          )}
        </div>
      )}

      <div className="px-4 md:px-6">
        {isLoading && books.length === 0 ? (
          <div className={GRID}>
            {[...Array(skeletonCount)].map((_, i) => (
              <BookCardSkeleton key={`skel-${i}`} />
            ))}
          </div>
        ) : displayed.length > 0 ? (
          <>
            <div className={GRID}>
              {displayed.map((book, index) => (
                <div
                  key={book.id}
                  className={`transition-all duration-500 ${index >= mobileLimit ? 'hidden xl:block' : ''}`}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                    transitionDelay: isVisible ? `${index * 25}ms` : '0ms',
                  }}
                >
                  <BookCard
                    id={book.id}
                    title={book.title}
                    author={book.author}
                    viewCount={book.viewCount}
                    rating={book.rating}
                    ratingCount={book.ratingCount}
                    coverImage={book.coverImage}
                    slug={book.slug}
                    storyId={book.storyId}
                  />
                </div>
              ))}
            </div>

            {hasMore && <div ref={sentinelRef} className="h-1" />}

            {isLoading && hasMore && (
              <div className={`${GRID} mt-4`}>
                {[...Array(4)].map((_, i) => (
                  <BookCardSkeleton key={`more-${i}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-sm text-on-surface-variant">
            Chưa có sách nào
          </div>
        )}
      </div>
    </section>
  );
}
