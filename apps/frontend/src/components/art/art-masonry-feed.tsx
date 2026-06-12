'use client';

import { useRef, useCallback } from 'react';
import { useArtFeed } from '@/lib/api/hooks/use-art';
import { ArtCard } from './art-card';
import { Loader2 } from 'lucide-react';

interface Props {
  currentUserId?: string;
}

// Skeleton card
function SkeletonCard({ height }: { height: number }) {
  return (
    <div
      className="rounded-2xl bg-surface-variant animate-pulse break-inside-avoid mb-3"
      style={{ height }}
    />
  );
}

const SKELETON_HEIGHTS = [200, 280, 240, 320, 180, 260, 300, 210];

export function ArtMasonryFeed({ currentUserId }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useArtFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const observerCb = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const obs = new IntersectionObserver(observerCb, { rootMargin: '200px' });
      obs.observe(node);
      return () => obs.disconnect();
    },
    [observerCb],
  );

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="columns-2 sm:columns-3 md:columns-3 lg:columns-4 gap-3">
        {SKELETON_HEIGHTS.map((h, i) => (
          <SkeletonCard key={i} height={h} />
        ))}
      </div>
    );
  }

  if (!isLoading && posts.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-on-surface-variant">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="opacity-30">
          <rect x="8" y="8" width="48" height="48" rx="8" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="26" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M8 44l12-12 8 8 8-10 12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-sm">Chưa có bài đăng nào</p>
        <p className="text-xs opacity-60">Hãy là người đăng ảnh đầu tiên!</p>
      </div>
    );
  }

  return (
    <>
      {/* CSS columns masonry — không cần JS */}
      <div className="columns-2 sm:columns-3 md:columns-3 lg:columns-4 gap-3">
        {posts.map((post) => (
          <ArtCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>

      {/* Sentinel cho infinite scroll */}
      <div ref={refCallback} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
    </>
  );
}
