'use client';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export function Loading({ fullScreen = false, message }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-blue-500 opacity-20"></div>
      </div>
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse transition-colors duration-300">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm transition-colors duration-300">
        {content}
      </div>
    );
  }

  return <div className="py-12">{content}</div>;
}

export function BookCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[150px] animate-pulse">
      <div className="flex flex-col gap-2">
        {/* Book Cover Skeleton */}
        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"></div>
        {/* Book Info Skeleton */}
        <div className="flex flex-col gap-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
}

export function BookSectionSkeleton() {
  return (
    <section className="mb-12">
      {/* Section Header Skeleton */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
      {/* Book List Skeleton */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4 pb-4">
          {[...Array(6)].map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

