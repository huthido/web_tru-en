'use client';

import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { ReadingHistory } from '@/lib/api/reading-history.service';

interface ContinueReadingCardProps {
  history: ReadingHistory;
  className?: string;
}

export function ContinueReadingCard({ history, className = '' }: ContinueReadingCardProps) {
  if (!history.story || !history.chapter) return null;

  const progress = Math.min(100, Math.max(0, history.storyProgress ?? history.progress));

  return (
    <Link
      href={`/stories/${history.story.slug}/chapters/${history.chapter.slug}`}
      className={`group block bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${className}`}
    >
      <div className="flex gap-4 items-start">
        {/* Cover Image */}
        {history.story.coverImage ? (
          <div className="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-md group-hover:shadow-lg transition-shadow duration-300">
            <OptimizedImage
              src={history.story.coverImage}
              alt={history.story.title}
              fill
              className="group-hover:scale-110 transition-transform duration-500"
              sizes={ImageSizes.bookThumbnail}
              objectFit="cover"
              quality={85}
              placeholder="blur"
              unoptimized={shouldUnoptimizeImage(history.story.coverImage)}
            />
          </div>
        ) : (
          <div className="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 shadow-md flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500 dark:text-gray-400"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
              {history.story.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-1 font-medium">
              {history.chapter.title}
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
              <span>Tiến độ đọc</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{Math.round(progress)}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Last Read Time */}
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {new Date(history.lastRead).toLocaleDateString('vi-VN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Arrow Icon */}
        <div className="flex items-center flex-shrink-0 pt-1">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors duration-300 group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

