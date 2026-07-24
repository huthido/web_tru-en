'use client';

import { useState, useRef, useCallback } from 'react';
import { usePaintings } from '@/lib/api/hooks/use-paintings';
import { Painting } from '@/lib/api/paintings.service';
import { PaintingCard } from '@/components/paintings/painting-card';
import { PaintingDetailModal } from '@/components/paintings/painting-detail-modal';

interface Props {
  /** Tác giả của tranh (id user chủ trang cá nhân). */
  authorId: string;
  /** Người đang xem — để modal biết có phải chủ tranh không. */
  currentUserId?: string;
  /** Xưng hô trong empty state: chủ trang xem thì "Bạn", người khác thì "Tác giả". */
  isMe?: boolean;
}

/**
 * Tab "Tranh" ở trang cá nhân — tranh trong gian hàng của đúng tác giả này.
 * Dùng lại PaintingCard + PaintingDetailModal của gian hàng chung, chỉ khác
 * là lọc theo authorId và bỏ phần đăng tranh (profile chỉ để xem).
 */
export function ProfilePaintingsGrid({ authorId, currentUserId, isMe }: Props) {
  const [selected, setSelected] = useState<Painting | null>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = usePaintings({
    authorId,
  });

  const paintings = data?.pages.flatMap((p) => p.items) ?? [];

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!el || !hasNextPage) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
        },
        { rootMargin: '200px' },
      );
      observerRef.current.observe(el);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-surface-container animate-pulse">
            <div className="aspect-[4/5] bg-surface-variant" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-surface-variant rounded w-3/4" />
              <div className="h-3 bg-surface-variant rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (paintings.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-on-surface-variant">
        <span className="text-5xl">🖼️</span>
        <p className="text-base font-medium">
          {isMe ? 'Bạn chưa đăng tranh nào.' : 'Tác giả chưa đăng tranh nào.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {paintings.map((p) => (
          <PaintingCard key={p.id} painting={p} onClick={() => setSelected(p)} />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <span className="w-6 h-6 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {selected && (
        <PaintingDetailModal
          painting={selected}
          currentUserId={currentUserId}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
