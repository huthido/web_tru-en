'use client';

import { memo } from 'react';
import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface BookCardProps {
  id: string;
  title: string;
  author?: string | null;
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

function formatRating(r?: number): string {
  if (!r || r <= 0) return '—';
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}

export const BookCard = memo(function BookCard({
  id, title, author, viewCount, rating, coverImage, slug,
}: BookCardProps) {
  const href = slug ? `/truyen/${slug}` : `/truyen/${id}`;

  return (
    <div className="group w-full">
      <div className="flex flex-col gap-2">
        {/* Cover — aspect 3:4, fluid width */}
        <div className="comic-hover-glow relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface-variant shadow-md border border-outline-variant">
          <Link href={href} className="absolute inset-0 z-10" aria-label={title}>
            {coverImage ? (
              <OptimizedImage
                src={coverImage}
                alt={title}
                fill
                className="transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                objectFit="cover"
                quality={85}
                placeholder="blur"
                unoptimized={
                  coverImage.includes('images.unsplash.com') ||
                  coverImage.includes('cache.staticscdn.net')
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                <svg width="48" height="48" viewBox="0 0 60 60" fill="none">
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

        {/* Info */}
        <Link href={href} className="flex flex-col gap-1 w-full">
          <h3 className="text-sm font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-snug">
            {title}
          </h3>
          {author && (
            <p className="text-xs text-primary truncate">{author}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
            <span className="flex items-center gap-0.5">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-amber-400 shrink-0"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{formatRating(rating)}</span>
            </span>
            <span className="text-on-surface-variant/30">·</span>
            <span className="flex items-center gap-0.5">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{formatViewCount(viewCount)}</span>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
});
