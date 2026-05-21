'use client';

import { memo } from 'react';
import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface BookCardProps {
  id: string;
  title: string;
  viewCount: number;
  rating?: number;
  ratingCount?: number;
  coverImage?: string | null;
  slug?: string;
  storyId?: string;
  showLikeButton?: boolean;
  iconType?: 'like' | 'follow' | 'none';
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

export const BookCard = memo(function BookCard({ id, title, viewCount, rating, ratingCount, coverImage, slug, storyId }: BookCardProps) {
  // Calculate filled stars based on rating (0-5)
  const filledStars = rating ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
  const totalStars = 5;
  const href = slug ? `/truyen/${slug}` : `/truyen/${id}`;

  return (
    <div className="group flex-shrink-0 w-[150px]">
      <div className="flex flex-col gap-3">
        {/* Book Cover */}
        <div className="comic-hover-glow relative w-[150px] h-[200px] rounded-xl overflow-hidden bg-surface-variant shadow-lg">
          <Link href={href} className="absolute inset-0 z-10" aria-label={title}>
            {coverImage ? (
              <OptimizedImage
                src={coverImage}
                alt={title}
                fill
                className="transition-transform duration-500 group-hover:scale-110"
                sizes="150px"
                objectFit="cover"
                quality={85}
                placeholder="blur"
                unoptimized={coverImage.includes('images.unsplash.com') || coverImage.includes('cache.staticscdn.net')}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
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
          </Link>
        </div>

        {/* Book Info */}
        <Link href={href} className="flex flex-col gap-1.5 w-[150px]">
          <h3 className="text-sm font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors duration-300 leading-tight">
            {title}
          </h3>
          <div className="flex flex-col gap-1">
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
              <span>{formatViewCount(viewCount)} lượt xem</span>
            </div>
            {/* Star Rating */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalStars }).map((_, index) => {
                  const isFilled = index + 1 <= filledStars;
                  return (
                    <svg
                      key={index}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={isFilled ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isFilled ? 'text-primary' : 'text-on-surface-variant/30'}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  );
                })}
              </div>
              {ratingCount !== undefined && ratingCount > 0 && (
                <span className="text-xs text-on-surface-variant">
                  ({formatViewCount(ratingCount)})
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
});
