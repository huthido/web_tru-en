import type { Metadata } from 'next';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverGet } from '@/lib/api/server-api';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import StoriesClient from './stories-client';

export const revalidate = 300;

type SearchParams = {
  page?: string;
  search?: string;
  category?: string;
  status?: string;
  sortBy?: string;
};

type Props = { searchParams: SearchParams };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = Number.parseInt(searchParams.page || '1', 10) || 1;
  const isSearch = Boolean(searchParams.search);

  const title = page > 1 ? `Kho truyện - Trang ${page}` : 'Kho truyện';

  return {
    title,
    description:
      'Kho truyện của YÊU: kiếm hiệp, tiên hiệp, ngôn tình, trinh thám, khoa học viễn tưởng — đọc miễn phí, cập nhật mỗi ngày.',
    // Trang kết quả tìm kiếm nội bộ không nên vào chỉ mục (Google khuyến nghị).
    robots: isSearch ? { index: false, follow: true } : { index: true, follow: true },
    alternates: {
      canonical: page > 1 ? absoluteUrl(`/truyen?page=${page}`) : absoluteUrl('/truyen'),
    },
  };
}

/**
 * Nạp sẵn trang truyện đầu tiên vào cache để danh sách nằm trong HTML server.
 * SSR luôn dùng limit 20 — khớp giá trị khởi tạo của usePageLimit khi chưa có
 * `window`, nhờ vậy dữ liệu hydrate trùng query key mà client tạo ra.
 */
export default async function StoriesPage({ searchParams }: Props) {
  const page = Number.parseInt(searchParams.page || '1', 10) || 1;
  const sortBy = searchParams.sortBy || 'newest';

  const params: Record<string, any> = { page, limit: 20, sortBy };
  if (searchParams.search) params.search = searchParams.search;
  if (searchParams.category) params.categories = [searchParams.category];
  if (searchParams.status && searchParams.status !== 'DRAFT') params.status = searchParams.status;

  const query = new URLSearchParams({
    page: String(page),
    limit: '20',
    sortBy,
  });
  if (searchParams.search) query.set('search', searchParams.search);
  if (searchParams.category) query.set('categories', searchParams.category);
  if (searchParams.status && searchParams.status !== 'DRAFT') query.set('status', searchParams.status);

  const queryClient = new QueryClient();
  const payload = await serverGet<{ data: any[]; meta: any }>(`/stories?${query.toString()}`, {
    revalidate,
  });

  if (payload && Array.isArray(payload.data)) {
    queryClient.setQueryData(['stories', params], payload);
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Kho truyện', item: absoluteUrl('/truyen') },
    ],
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd data={breadcrumb} />
      <StoriesClient />
    </HydrationBoundary>
  );
}
