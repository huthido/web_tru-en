import type { Metadata } from 'next';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Hydrate } from '@/components/providers/hydrate';
import { serverGet } from '@/lib/api/server-api';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import HomeClient from './home-client';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/') },
};

/** Default sections used as fallback when API is unavailable. */
const DEFAULT_SECTIONS = [
  { key: 'newest', label: 'Mới nhất', sortPath: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', order: 0, isActive: true },
  { key: 'bestOfMonth', label: 'Hay nhất tháng', sortPath: 'best-of-month', limit: 15, seeMorePath: '/truyen', sortBy: 'viewCount', order: 1, isActive: true },
  { key: 'topRated', label: 'Đánh giá cao', sortPath: 'top-rated', limit: 20, seeMorePath: '/truyen', sortBy: 'rating', order: 2, isActive: true },
  { key: 'recommended', label: 'Đề xuất', sortPath: 'recommended', limit: 15, seeMorePath: '/truyen', sortBy: 'popular', order: 3, isActive: true },
  { key: 'mostLiked', label: 'Yêu thích', sortPath: 'most-liked', limit: 15, seeMorePath: '/truyen', sortBy: 'popular', order: 4, isActive: true },
];

export default async function HomePage() {
  const queryClient = new QueryClient();

  // Fetch active sections from API (fallback to defaults)
  let sections: typeof DEFAULT_SECTIONS;
  try {
    const apiSections = await serverGet<any[]>('/homepage-sections', { revalidate });
    sections = Array.isArray(apiSections) && apiSections.length > 0
      ? apiSections
      : DEFAULT_SECTIONS;
  } catch {
    sections = DEFAULT_SECTIONS;
  }

  // Pre-fetch stories for each active section (SSR)
  await Promise.all(
    sections.map(async (section) => {
      try {
        const stories = await serverGet<any[]>(
          `/stories/homepage/${section.sortPath}?limit=${section.limit}`,
          { revalidate }
        );
        if (Array.isArray(stories)) {
          queryClient.setQueryData(['stories', 'homepage', section.key, section.limit], stories);
        }
      } catch {
        // Skip failed sections gracefully
      }
    })
  );

  // Also prefetch section config for client-side
  queryClient.setQueryData(['homepage-sections'], sections);

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
    <Hydrate state={dehydrate(queryClient)}>
      <JsonLd data={websiteLd} />
      <HomeClient initialSections={sections} />
    </Hydrate>
  );
}
