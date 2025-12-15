'use client';

import Link from 'next/link';
import Image from 'next/image';

interface BookCardProps {
  id: string;
  title: string;
  viewCount: number;
  coverImage?: string | null;
  slug?: string;
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

export function BookCard({ id, title, viewCount, coverImage, slug }: BookCardProps) {
  return (
    <Link
      href={slug ? `/books/${slug}` : `/books/${id}`}
      className="group flex-shrink-0 w-[150px] transition-all duration-500 hover:scale-105 active:scale-95"
    >
      <div className="flex flex-col gap-2">
        {/* Book Cover - Fixed size to ensure consistency */}
        <div className="relative w-[150px] h-[200px] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md group-hover:shadow-2xl transition-all duration-500">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="150px"
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
        </div>

        {/* Book Info */}
        <div className="flex flex-col gap-1 w-[150px]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
            {title}
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
            <span>{formatViewCount(viewCount)} lượt xem</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

