import type { Metadata } from 'next';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Hydrate } from '@/components/providers/hydrate';
import { serverGet } from '@/lib/api/server-api';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import PaintingsClient from './paintings-client';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Gian hàng Tranh',
  description:
    'Gian hàng tranh của YÊU: tranh vẽ tay, tranh số hoá và tác phẩm nghệ thuật do cộng đồng đăng bán. Xem và liên hệ trực tiếp với hoạ sĩ.',
  alternates: { canonical: absoluteUrl('/tranh') },
};

const PAGE_SIZE = 20;

/**
 * Server component nạp sẵn trang tranh đầu tiên vào cache react-query.
 *
 * Trang này trước đây là `'use client'` thuần nên HTML gửi cho crawler chỉ có
 * banner cookie, dù nó nằm trong sitemap. Query key và hình dạng dữ liệu phải
 * khớp `usePaintings()` — đó là `useInfiniteQuery`, nên cache cần bọc
 * `{ pages, pageParams }` chứ không phải mảng phẳng.
 */
export default async function PaintingsPage() {
  const queryClient = new QueryClient();

  const payload = await serverGet<{ items: any[]; meta: any }>(
    `/paintings?page=1&limit=${PAGE_SIZE}`,
    { revalidate }
  );

  if (payload && Array.isArray(payload.items)) {
    // `usePaintings()` được gọi không tham số → params là undefined.
    queryClient.setQueryData(['paintings', 'list', undefined], {
      pages: [payload],
      pageParams: [1],
    });
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Gian hàng Tranh', item: absoluteUrl('/tranh') },
    ],
  };

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <JsonLd data={breadcrumb} />
      <PaintingsClient />
    </Hydrate>
  );
}
