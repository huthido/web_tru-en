'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { usePaintings } from '@/lib/api/hooks/use-paintings';
import { Painting } from '@/lib/api/paintings.service';
import { PaintingCard } from './painting-card';
import { PaintingUploadModal } from './painting-upload-modal';
import { PaintingDetailModal } from './painting-detail-modal';

interface Props {
  currentUserId?: string;
  isLoggedIn: boolean;
}

export function PaintingTab({ currentUserId, isLoggedIn }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<Painting | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = usePaintings();

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

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-on-surface">Gian hàng tranh</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">Mua bán tranh nghệ thuật từ cộng đồng</p>
        </div>
        {isLoggedIn && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Đăng tranh
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
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
      ) : paintings.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="text-5xl">🖼️</span>
          <p className="text-base font-medium">Chưa có tranh nào</p>
          {isLoggedIn && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
            >
              Đăng tranh đầu tiên
            </button>
          )}
        </div>
      ) : (
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
        </>
      )}

      {/* FAB mobile */}
      {isLoggedIn && (
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-20 right-4 md:hidden z-30 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Đăng tranh"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {showUpload && <PaintingUploadModal onClose={() => setShowUpload(false)} />}
      {selected && (
        <PaintingDetailModal
          painting={selected}
          currentUserId={currentUserId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
