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

const DEFAULT_SECTIONS: Array<{ id: string; key: string; label: string; algorithm: string; sortPath: string; limit: number; seeMorePath: string; sortBy: string; mode: 'auto' | 'manual'; order: number; isActive: boolean; stories: any[] }> = [
  { id: '', key: 'newest', label: 'Mới nhất', algorithm: 'newest', sortPath: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', mode: 'auto', order: 0, isActive: true, stories: [] },
  { id: '', key: 'bestOfMonth', label: 'Hay nhất tháng', algorithm: 'best-of-month', sortPath: 'best-of-month', limit: 15, seeMorePath: '/truyen', sortBy: 'viewCount', mode: 'auto', order: 1, isActive: true, stories: [] },
  { id: '', key: 'topRated', label: 'Đánh giá cao', algorithm: 'top-rated', sortPath: 'top-rated', limit: 20, seeMorePath: '/truyen', sortBy: 'rating', mode: 'auto', order: 2, isActive: true, stories: [] },
  { id: '', key: 'recommended', label: 'Đề xuất', algorithm: 'recommended', sortPath: 'recommended', limit: 15, seeMorePath: '/truyen', sortBy: 'popular', mode: 'auto', order: 3, isActive: true, stories: [] },
  { id: '', key: 'mostLiked', label: 'Yêu thích', algorithm: 'most-liked', sortPath: 'most-liked', limit: 15, seeMorePath: '/truyen', sortBy: 'popular', mode: 'auto', order: 4, isActive: true, stories: [] },
];

export default async function HomePage() {
  const queryClient = new QueryClient();

  // Fetch active sections from API (includes manual stories data)
  let sections: typeof DEFAULT_SECTIONS;
  try {
    const apiSections = await serverGet<any[]>('/homepage-sections', { revalidate });
    sections = Array.isArray(apiSections) && apiSections.length > 0 ? apiSections : DEFAULT_SECTIONS;
  } catch {
    sections = DEFAULT_SECTIONS;
  }

  // Pre-fetch stories for AUTO-mode sections via dynamic endpoint
  await Promise.all(
    sections
      .filter((s) => s.mode === 'auto' && s.id)
      .map(async (section) => {
        try {
          const stories = await serverGet<any[]>(
            `/stories/homepage/section/${section.id}?limit=${section.limit}`,
            { revalidate }
          );
          if (Array.isArray(stories)) {
            queryClient.setQueryData(['stories', 'homepage', 'section', section.id, section.limit], stories);
          }
        } catch {
          // Skip failed sections
        }
      })
  );

  // Prefetch section config (includes manual stories)
  queryClient.setQueryData(['homepage-sections'], sections);

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'YÊU',
    url: absoluteUrl('/'),
    inLanguage: 'vi',
    description: 'Mạng Xã Hội Giải Trí Nghệ Thuật — đọc truyện online miễn phí, đa dạng thể loại.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/tim-kiem')}?q={search_term_string}` },
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
