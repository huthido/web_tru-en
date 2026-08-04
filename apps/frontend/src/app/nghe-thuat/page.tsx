import type { Metadata } from 'next';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Hydrate } from '@/components/providers/hydrate';
import { serverGet } from '@/lib/api/server-api';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import ArtClient from './art-client';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Cộng đồng Nghệ thuật',
  description:
    'Cộng đồng nghệ thuật của YÊU: ảnh vẽ, tranh minh hoạ và tác phẩm sáng tạo do thành viên chia sẻ mỗi ngày.',
  alternates: { canonical: absoluteUrl('/nghe-thuat') },
};

/**
 * Server component nạp sẵn feed nghệ thuật để HTML trả về đã có nội dung thật.
 *
 * `useArtFeed()` là `useInfiniteQuery` phân trang theo cursor, `initialPageParam`
 * là `undefined` — cache dựng ở đây phải dùng đúng giá trị đó, nếu không lần
 * hydrate đầu tiên sẽ lệch key và client fetch lại từ đầu.
 */
export default async function ArtPage() {
  const queryClient = new QueryClient();

  const [feed, stories] = await Promise.all([
    serverGet<{ items: any[]; hasMore: boolean; nextCursor?: string }>('/art/posts?limit=20', {
      revalidate,
    }),
    serverGet<any[]>('/art/stories', { revalidate }),
  ]);

  if (feed && Array.isArray(feed.items)) {
    queryClient.setQueryData(['art', 'feed'], {
      pages: [feed],
      pageParams: [undefined],
    });
  }

  if (Array.isArray(stories)) {
    queryClient.setQueryData(['art', 'stories'], stories);
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Cộng đồng Nghệ thuật',
        item: absoluteUrl('/nghe-thuat'),
      },
    ],
  };

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <JsonLd data={breadcrumb} />
      <ArtClient />
    </Hydrate>
  );
}
