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
  // Clamp rating between 0 and 5, then round to nearest integer
  const filledStars = rating ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
  const totalStars = 5;
  return (
    <div className="group flex-shrink-0 w-[150px] transition-all duration-500 hover:scale-105 active:scale-95">
      <div className="flex flex-col gap-2">
        {/* Book Cover - Fixed size to ensure consistency */}
        <div className="relative w-[150px] h-[200px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md group-hover:shadow-2xl transition-all duration-500">
          <Link
            href={slug ? `/truyen/${slug}` : `/truyen/${id}`}
            className="absolute inset-0 z-10"
          >
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
        <Link
          href={slug ? `/truyen/${slug}` : `/truyen/${id}`}
          className="flex flex-col gap-1 w-[150px]"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
            {title}
          </h3>
          <div className="flex flex-col gap-1">
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
              <span>{formatViewCount(viewCount)} lượt xem</span>
            </div>
            {/* Star Rating */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalStars }).map((_, index) => {
                  const starNumber = index + 1;
                  const isFilled = starNumber <= filledStars;
                  return (
                    <svg
                      key={index}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={isFilled ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isFilled ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  );
                })}
              </div>
              {ratingCount !== undefined && ratingCount > 0 && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
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

