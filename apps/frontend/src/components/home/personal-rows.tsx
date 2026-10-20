'use client';

import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage } from '@/utils/image-utils';
import { BookCard } from '@/components/books/book-card';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useContinueReading } from '@/lib/api/hooks/use-reading-history';
import { useRecommendedStoriesForUser } from '@/lib/api/hooks/use-stories';
import type { Story } from '@/lib/api/stories.service';

function RowHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3 px-4 md:px-6">
      <h2 className="text-base md:text-xl font-display font-extrabold tracking-tight text-on-surface">{title}</h2>
      {href && (
        <Link href={href} className="text-xs md:text-sm font-semibold text-primary hover:underline whitespace-nowrap">
          {linkLabel || 'Xem tất cả →'}
        </Link>
      )}
    </div>
  );
}

/**
 * "Đọc tiếp" — truyện user đọc gần nhất, mỗi truyện 1 thẻ, bấm là vào đúng
 * chương đang đọc (trang chương tự cuộn về vị trí đã lưu). Chỉ hiện khi đã
 * đăng nhập và có lịch sử.
 */
export function ContinueReadingRow() {
  const { isAuthenticated } = useAuth();
  const { data: history = [] } = useContinueReading(10, isAuthenticated);

  const items = (Array.isArray(history) ? history : []).filter((h) => h.story && h.chapter);
  if (!isAuthenticated || items.length === 0) return null;

  return (
    <section className="pt-4 md:pt-6" aria-label="Đọc tiếp">
      <RowHeader title="Đọc tiếp" href="/lich-su" linkLabel="Lịch sử →" />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-6 pb-1 snap-x">
        {items.map((h) => {
          const story = h.story!;
          const chapter = h.chapter!;
          const progress = Math.round(Math.min(100, Math.max(0, h.storyProgress ?? h.progress ?? 0)));
          return (
            <Link
              key={h.id}
              href={`/truyen/${story.slug}/chuong/${chapter.slug}`}
              className="group snap-start flex-shrink-0 w-[260px] md:w-[300px] flex gap-3 p-2.5 rounded-xl bg-surface-container border border-outline-variant/60 hover:bg-surface-container-high transition-colors"
            >
              <div className="relative w-14 h-[74px] flex-shrink-0 rounded-lg overflow-hidden bg-surface-variant">
                {story.coverImage && (
                  <OptimizedImage
                    src={story.coverImage}
                    alt={story.title}
                    fill
                    sizes="56px"
                    objectFit="cover"
                    quality={70}
                    unoptimized={shouldUnoptimizeImage(story.coverImage)}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                    {story.title}
                  </p>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{chapter.title}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1">
                    <span className="font-semibold text-primary">Đọc tiếp →</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-variant overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * "Dành cho bạn" — gợi ý theo thể loại/tag của truyện đã đọc (backend
 * GET /stories/recommended; chưa có lịch sử thì backend trả truyện điểm cao).
 */
export function ForYouRow() {
  const { isAuthenticated } = useAuth();
  const { data: stories = [] } = useRecommendedStoriesForUser(15, isAuthenticated);

  if (!isAuthenticated || stories.length === 0) return null;

  return (
    <section className="mb-10" aria-label="Dành cho bạn">
      <RowHeader title="Dành cho bạn" />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-6 pb-1 snap-x">
        {stories.map((story: Story) => (
          <div key={story.id} className="snap-start flex-shrink-0 w-[118px] sm:w-[140px] md:w-[156px]">
            <BookCard
              id={story.id}
              title={story.title}
              author={story.authorName || story.author?.displayName || story.author?.username || null}
              viewCount={story.viewCount || 0}
              rating={story.rating || 0}
              ratingCount={story.ratingCount || 0}
              coverImage={story.coverImage}
              slug={story.slug}
              storyId={story.id}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
