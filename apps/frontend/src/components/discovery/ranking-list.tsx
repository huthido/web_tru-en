import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { RankedStory, RankingMetric } from '@/lib/api/server-discovery';
import { formatCompact } from './discovery-shell';

/** Màu huy hiệu hạng: #1–#3 nổi bật, còn lại chữ số thường. */
const MEDAL_CLASS: Record<number, string> = {
  1: 'bg-primary text-on-primary',
  2: 'bg-primary-container text-on-primary-container',
  3: 'bg-tertiary-container text-on-tertiary-container',
};

function metricValue(story: RankedStory, metric: RankingMetric): { value: string; unit: string } {
  if (metric === 'rating') {
    const score = Number(story.rankValue) || 0;
    const count = story.rankCount ?? story.ratingCount ?? 0;
    return {
      value: score > 0 ? score.toFixed(1).replace('.', ',') : '—',
      unit: `${formatCompact(count)} đánh giá`,
    };
  }
  return {
    value: formatCompact(story.rankValue),
    unit: metric === 'views' ? 'lượt xem' : 'theo dõi',
  };
}

export function RankingList({ items, metric }: { items: RankedStory[]; metric: RankingMetric }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((story) => {
        const rank = story.rank;
        const medal = MEDAL_CLASS[rank];
        const author = story.authorName || story.author?.displayName || story.author?.username || '';
        const { value, unit } = metricValue(story, metric);
        return (
          <li key={story.id}>
            <Link
              href={`/truyen/${story.slug}`}
              className={`group flex items-center gap-3 rounded-2xl p-2.5 pr-3 transition-colors hover:bg-surface-container-high ${
                medal ? 'bg-surface-container border border-outline-variant' : ''
              }`}
            >
              <span
                className={`shrink-0 inline-flex items-center justify-center rounded-full font-display font-bold tabular-nums ${
                  medal ? `w-9 h-9 text-base ${medal}` : 'w-9 h-9 text-sm text-on-surface-variant'
                }`}
                aria-label={`Hạng ${rank}`}
              >
                {rank}
              </span>

              <span className="relative shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-surface-variant border border-outline-variant">
                {story.coverImage ? (
                  <OptimizedImage
                    src={story.coverImage}
                    alt={story.title}
                    fill
                    sizes="48px"
                    objectFit="cover"
                    quality={70}
                  />
                ) : null}
              </span>

              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {story.title}
                </span>
                {author && <span className="block mt-0.5 text-xs text-on-surface-variant truncate">{author}</span>}
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-on-surface tabular-nums">{value}</span>
                <span className="block text-[11px] text-on-surface-variant whitespace-nowrap">{unit}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
