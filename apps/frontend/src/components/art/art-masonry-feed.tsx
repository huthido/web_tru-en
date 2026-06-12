'use client';

import { useRef, useCallback } from 'react';
import { useArtFeed } from '@/lib/api/hooks/use-art';
import { ArtCard } from './art-card';
import { Loader2, ImageIcon } from 'lucide-react';

interface Props {
  currentUserId?: string;
}

function SkeletonPost() {
  return (
    <div className="bg-surface border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-surface-variant" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-28 bg-surface-variant rounded" />
          <div className="h-2.5 w-16 bg-surface-variant rounded" />
        </div>
      </div>
      <div className="bg-surface-variant" style={{ height: 320 }} />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 w-20 bg-surface-variant rounded" />
        <div className="h-3 w-48 bg-surface-variant rounded" />
      </div>
    </div>
  );
}

export function ArtMasonryFeed({ currentUserId }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useArtFeed();

  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
        },
        { rootMargin: '300px' },
      );
      obs.observe(node);
      return () => obs.disconnect();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 px-0 sm:px-4">
        {[0, 1, 2].map((i) => <SkeletonPost key={i} />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-on-surface-variant">
        <ImageIcon className="w-14 h-14 opacity-25" />
        <p className="text-sm font-medium">Chưa có bài đăng nào</p>
        <p className="text-xs opacity-60">Hãy là người đăng ảnh đầu tiên!</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto space-y-4 px-0 sm:px-4">
        {posts.map((post) => (
          <ArtCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>

      <div ref={refCallback} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
    </>
  );
}
