'use client';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

export function Loading({ fullScreen = false, message }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-outline-variant border-t-primary"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-4 border-primary opacity-20"></div>
      </div>
      {message && (
        <p className="text-sm text-on-surface-variant animate-pulse transition-colors duration-300">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-sm transition-colors duration-300">
        {content}
      </div>
    );
  }

  return <div className="py-12">{content}</div>;
}

export function BookCardSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface-variant" />
        <div className="flex flex-col gap-1.5">
          <div className="h-4 bg-surface-variant rounded w-full" />
          <div className="h-3 bg-surface-variant rounded w-2/3" />
          <div className="h-3 bg-surface-variant rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function BookSectionSkeleton() {
  return (
    <section className="mb-12 px-4 md:px-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {[...Array(10)].map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

