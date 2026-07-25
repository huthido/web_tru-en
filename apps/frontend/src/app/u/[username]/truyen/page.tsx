'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { BookCard } from '@/components/books/book-card';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorProfile, useAuthorStories } from '@/lib/api/hooks/use-authors';
import { usePageLimit } from '@/hooks/use-page-limit';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Trang "Truyện" của tác giả — grid truyện đã xuất bản + phân trang. */
export default function ProfileStoriesPage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { user: me } = useAuth();
  const { data: profile } = useAuthorProfile(username);
  // Phân trang theo màn hình: xl (lưới 6 cột) 24 truyện/trang, nhỏ hơn 20.
  const limit = usePageLimit(20, 24);
  const [page, setPage] = useState(1);
  const { data: storiesPage, isLoading } = useAuthorStories(profile?.id, page, limit);

  const isMe = !!me && !!profile && me.id === profile.id;
  const totalPages = storiesPage?.meta?.totalPages || 1;

  if (isLoading) {
    return <div className="py-10"><Loading /></div>;
  }

  if (!storiesPage?.data.length) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-on-surface-variant">
        <span className="text-5xl">📖</span>
        <p className="text-base font-medium">
          {isMe ? 'Bạn chưa đăng truyện nào.' : 'Tác giả chưa đăng truyện nào.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        {storiesPage.data.map((s) => (
          <BookCard
            key={s.id}
            id={s.id}
            slug={s.slug}
            title={s.title}
            viewCount={s.viewCount}
            rating={s.rating}
            ratingCount={s.ratingCount}
            coverImage={s.coverImage}
          />
        ))}
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-2 text-sm text-on-surface-variant">
            Trang <b className="text-on-surface">{page}</b> / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
