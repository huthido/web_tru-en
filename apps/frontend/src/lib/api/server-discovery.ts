/**
 * Dữ liệu phía server cho các trang khám phá công khai: bảng xếp hạng
 * (/bang-xep-hang) và trang thể loại (/the-loai, /the-loai/[slug]).
 *
 * SSR luôn gọi ẨN DANH nên chỉ nhận truyện `maturity = ALL` — đúng mặc định an
 * toàn của Families Policy (nội dung người lớn không vào HTML công khai).
 * Mọi hàm trả về giá trị rỗng khi backend lỗi/chưa có endpoint, để trang hiển
 * thị trạng thái trống thay vì sập.
 */
import { serverGet } from './server-api';
import type { Story } from './stories.service';

export const DISCOVERY_REVALIDATE = 300;

export type RankingPeriod = 'day' | 'week' | 'month' | 'all';
export type RankingMetric = 'views' | 'follows' | 'rating';

export type RankedStory = Story & {
  rank: number;
  /** Lượt xem / lượt theo dõi / điểm trung bình — tuỳ `metric`. */
  rankValue: number;
  /** Số lượt đánh giá (chỉ có khi metric = rating). */
  rankCount?: number;
};

export type RankingsPayload = {
  period: RankingPeriod;
  metric: RankingMetric;
  since: string | null;
  items: RankedStory[];
};

export async function getRankingsServer(
  period: RankingPeriod,
  metric: RankingMetric,
  limit = 50
): Promise<RankingsPayload> {
  const payload = await serverGet<RankingsPayload>(
    `/stories/rankings?period=${period}&metric=${metric}&limit=${limit}`,
    { revalidate: DISCOVERY_REVALIDATE }
  );
  return {
    period,
    metric,
    since: payload?.since ?? null,
    items: Array.isArray(payload?.items) ? payload!.items : [],
  };
}

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  storyCount: number;
};

/**
 * Danh sách thể loại kèm số truyện công khai. Backend cũ chưa có
 * `/categories/with-counts` thì lùi về `/categories` (không có số đếm).
 */
export async function getCategoriesWithCountsServer(): Promise<{
  categories: CategoryWithCount[];
  hasCounts: boolean;
}> {
  const withCounts = await serverGet<CategoryWithCount[]>('/categories/with-counts', {
    revalidate: DISCOVERY_REVALIDATE,
  });
  if (Array.isArray(withCounts)) return { categories: withCounts, hasCounts: true };

  const plain = await serverGet<CategoryWithCount[]>('/categories', {
    revalidate: DISCOVERY_REVALIDATE,
  });
  return {
    categories: Array.isArray(plain)
      ? plain.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, storyCount: 0 }))
      : [],
    hasCounts: false,
  };
}

export const GENRE_SORTS = {
  updated: 'Mới cập nhật',
  viewCount: 'Xem nhiều',
  rating: 'Đánh giá cao',
} as const;

export type GenreSort = keyof typeof GENRE_SORTS;

export const GENRE_PAGE_SIZE = 24;

export type PaginatedStories = {
  data: Story[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export async function getGenreStoriesServer(
  slug: string,
  sort: GenreSort,
  page: number
): Promise<PaginatedStories> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(GENRE_PAGE_SIZE),
    sortBy: sort,
    categories: slug,
  });
  const payload = await serverGet<PaginatedStories>(`/stories?${query.toString()}`, {
    revalidate: DISCOVERY_REVALIDATE,
  });
  if (payload && Array.isArray(payload.data)) return payload;
  return { data: [], meta: { total: 0, page, limit: GENRE_PAGE_SIZE, totalPages: 0 } };
}
