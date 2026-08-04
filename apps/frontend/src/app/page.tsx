import type { Metadata } from 'next';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverGet } from '@/lib/api/server-api';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import HomeClient from './home-client';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/') },
};

/** Các nhóm truyện trang chủ đang hiển thị — key phải khớp hook trong home-client. */
const HOME_SECTIONS = [
  { key: 'newest', path: 'newest', limit: 15 },
  { key: 'best-of-month', path: 'best-of-month', limit: 15 },
  { key: 'recommended', path: 'recommended', limit: 15 },
  { key: 'top-rated', path: 'top-rated', limit: 20 },
  { key: 'most-liked', path: 'most-liked', limit: 15 },
] as const;

export default async function HomePage() {
  const queryClient = new QueryClient();

  await Promise.all(
    HOME_SECTIONS.map(async (section) => {
      const stories = await serverGet<any[]>(
        `/stories/homepage/${section.path}?limit=${section.limit}`,
        { revalidate }
      );
      if (Array.isArray(stories)) {
        queryClient.setQueryData(['stories', 'homepage', section.key, section.limit], stories);
      }
    })
  );

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'YÊU',
    url: absoluteUrl('/'),
    inLanguage: 'vi',
    description:
      'Mạng Xã Hội Giải Trí Nghệ Thuật — đọc truyện online miễn phí, đa dạng thể loại.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/tim-kiem')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd data={websiteLd} />
      <HomeClient />
    </HydrationBoundary>
  );
}
