import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import { Breadcrumbs, DiscoveryShell } from '@/components/discovery/discovery-shell';
import { FilterTabs } from '@/components/discovery/filter-tabs';
import { RankingList } from '@/components/discovery/ranking-list';
import {
  getRankingsServer,
  type RankingMetric,
  type RankingPeriod,
} from '@/lib/api/server-discovery';

export const revalidate = 300;

const PERIODS: Array<{ key: RankingPeriod; label: string; hint: string }> = [
  { key: 'day', label: 'Ngày', hint: '24 giờ qua' },
  { key: 'week', label: 'Tuần', hint: '7 ngày qua' },
  { key: 'month', label: 'Tháng', hint: '30 ngày qua' },
  { key: 'all', label: 'Mọi lúc', hint: 'mọi thời điểm' },
];

const METRICS: Array<{ key: RankingMetric; label: string; title: string; empty: string }> = [
  { key: 'views', label: 'Lượt xem', title: 'xem nhiều nhất', empty: 'có lượt xem' },
  { key: 'follows', label: 'Theo dõi', title: 'được theo dõi nhiều nhất', empty: 'có lượt theo dõi mới' },
  { key: 'rating', label: 'Đánh giá', title: 'đánh giá cao nhất', empty: 'được đánh giá' },
];

const DEFAULT_PERIOD: RankingPeriod = 'week';
const DEFAULT_METRIC: RankingMetric = 'views';

type Props = { searchParams: { period?: string; metric?: string } };

function parse(searchParams: Props['searchParams']) {
  const period = PERIODS.find((p) => p.key === searchParams.period) || PERIODS.find((p) => p.key === DEFAULT_PERIOD)!;
  const metric = METRICS.find((m) => m.key === searchParams.metric) || METRICS.find((m) => m.key === DEFAULT_METRIC)!;
  return { period, metric };
}

function hrefFor(period: RankingPeriod, metric: RankingMetric): string {
  const params = new URLSearchParams();
  if (period !== DEFAULT_PERIOD) params.set('period', period);
  if (metric !== DEFAULT_METRIC) params.set('metric', metric);
  const qs = params.toString();
  return qs ? `/bang-xep-hang?${qs}` : '/bang-xep-hang';
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const { period, metric } = parse(searchParams);
  const isDefault = period.key === DEFAULT_PERIOD && metric.key === DEFAULT_METRIC;
  const title = isDefault
    ? 'Bảng xếp hạng truyện — YÊU'
    : `Truyện ${metric.title} (${period.hint}) — YÊU`;

  return {
    title: { absolute: title },
    description: `Bảng xếp hạng truyện trên YÊU: top 50 truyện ${metric.title} ${period.hint}. Xếp theo lượt xem, lượt theo dõi và điểm đánh giá của độc giả.`,
    alternates: { canonical: absoluteUrl(hrefFor(period.key, metric.key)) },
  };
}

export default async function RankingsPage({ searchParams }: Props) {
  const { period, metric } = parse(searchParams);
  const { items } = await getRankingsServer(period.key, metric.key, 50);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Bảng xếp hạng', item: absoluteUrl('/bang-xep-hang') },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Truyện ${metric.title} ${period.hint}`,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((s) => ({
      '@type': 'ListItem',
      position: s.rank,
      url: absoluteUrl(`/truyen/${s.slug}`),
      name: s.title,
    })),
  };

  return (
    <DiscoveryShell>
      <JsonLd data={items.length > 0 ? [breadcrumb, itemList] : breadcrumb} />
      <Breadcrumbs items={[{ name: 'Trang chủ', href: '/' }, { name: 'Bảng xếp hạng' }]} />

      <header className="mb-5">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface">Bảng xếp hạng</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Top 50 truyện {metric.title} · {period.hint}
        </p>
      </header>

      <div className="flex flex-col gap-3 mb-5">
        <FilterTabs
          label="Khoảng thời gian"
          variant="segmented"
          active={period.key}
          tabs={PERIODS.map((p) => ({ key: p.key, label: p.label, href: hrefFor(p.key, metric.key) }))}
        />
        <FilterTabs
          label="Tiêu chí xếp hạng"
          active={metric.key}
          tabs={METRICS.map((m) => ({ key: m.key, label: m.label, href: hrefFor(period.key, m.key) }))}
        />
      </div>

      {items.length > 0 ? (
        <RankingList items={items} metric={metric.key} />
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container px-6 py-12 text-center">
          <p className="text-base font-semibold text-on-surface">Chưa có dữ liệu xếp hạng</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chưa có truyện nào {metric.empty} trong {period.hint}.
          </p>
          {period.key !== 'all' && (
            <Link
              href={hrefFor('all', metric.key)}
              className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
            >
              Xem bảng Mọi lúc
            </Link>
          )}
        </div>
      )}

      {metric.key === 'rating' && items.length > 0 && (
        <p className="mt-4 text-xs text-on-surface-variant">
          {period.key === 'all'
            ? 'Chỉ tính truyện có từ 3 lượt đánh giá trở lên.'
            : `Điểm trung bình các lượt đánh giá trong ${period.hint}.`}
        </p>
      )}
    </DiscoveryShell>
  );
}
