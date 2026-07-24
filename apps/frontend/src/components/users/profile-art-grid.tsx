'use client';

import { useState, useRef, useCallback } from 'react';
import { Heart, MessageCircle, X } from 'lucide-react';
import { useUserArtPosts } from '@/lib/api/hooks/use-art';
import { ArtPost } from '@/lib/api/art.service';
import { ArtCard } from '@/components/art/art-card';

interface Props {
  /** Chủ trang cá nhân — lấy ảnh nghệ thuật của đúng người này. */
  userId: string;
  /** Người đang xem — ArtCard cần để biết quyền like/xoá. */
  currentUserId?: string;
  isMe?: boolean;
}

function formatNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

/**
 * Tab "Ảnh nghệ thuật" ở trang cá nhân — lưới ô vuông kiểu Instagram profile
 * (gọn hơn feed masonry ở trang chủ). Bấm một ảnh mở ArtCard đầy đủ trong
 * lightbox để like / bình luận / xoá mà không phải rời trang.
 */
export function ProfileArtGrid({ userId, currentUserId, isMe }: Props) {
  const [selected, setSelected] = useState<ArtPost | null>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useUserArtPosts(userId);

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-surface-variant animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-on-surface-variant">
        <span className="text-5xl">🎨</span>
        <p className="text-base font-medium">
          {isMe ? 'Bạn chưa đăng ảnh nghệ thuật nào.' : 'Tác giả chưa đăng ảnh nghệ thuật nào.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
        {posts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-surface-variant"
            aria-label={p.caption || 'Ảnh nghệ thuật'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageUrl}
              alt={p.caption || 'Ảnh nghệ thuật'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay số like / bình luận khi hover (desktop) */}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-4 text-white text-sm font-semibold">
              <span className="inline-flex items-center gap-1">
                <Heart className="w-4 h-4 fill-white" /> {formatNum(p.likeCount)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-4 h-4 fill-white" /> {formatNum(p.commentCount)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <span className="w-6 h-6 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Lightbox: ArtCard đầy đủ (like / bình luận / xoá) */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 overflow-y-auto p-4 flex items-start sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
                className="p-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <ArtCard post={selected} currentUserId={currentUserId} />
          </div>
        </div>
      )}
    </>
  );
}
