import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Hydrate } from '@/components/providers/hydrate';
import { getStoryServer, getChaptersServer } from '@/lib/api/server-stories';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import StoryDetailClient from './story-detail-client';

// Nội dung truyện đổi chậm — cache 5 phút, đủ tươi mà vẫn nhanh cho crawler.
export const revalidate = 300;

type Props = { params: { slug: string } };

/**
 * Server component: nạp sẵn truyện + danh sách chương vào react-query cache rồi
 * mới render UI (vẫn là component client cũ, không đổi giao diện).
 *
 * Trước đây trang này là 'use client' thuần: Googlebot nhận về HTML rỗng vì dữ
 * liệu chỉ được fetch sau khi JS chạy. Với HydrationBoundary, lần render đầu
 * trên server đã có dữ liệu nên HTML chứa tên truyện, mô tả và danh sách chương.
 */
export default async function StoryPage({ params }: Props) {
  const { slug } = params;

  const [story, chapters] = await Promise.all([
    getStoryServer(slug),
    getChaptersServer(slug),
  ]);

  const queryClient = new QueryClient();
  if (story) queryClient.setQueryData(['story', slug], story);
  if (chapters.length > 0) queryClient.setQueryData(['chapters', slug], chapters);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Truyện', item: absoluteUrl('/truyen') },
      ...(story
        ? [{ '@type': 'ListItem', position: 3, name: story.title, item: absoluteUrl(`/truyen/${slug}`) }]
        : []),
    ],
  };

  const bookLd = story
    ? {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: story.title,
        url: absoluteUrl(`/truyen/${slug}`),
        image: story.coverImage || undefined,
        description: story.description || undefined,
        inLanguage: 'vi',
        bookFormat: 'https://schema.org/EBook',
        numberOfPages: undefined,
        author: {
          '@type': 'Person',
          name: (story as any).authorName || (story as any).author?.displayName || 'YÊU',
        },
        publisher: { '@type': 'Organization', name: 'YÊU', url: absoluteUrl('/') },
        datePublished: story.createdAt || undefined,
        dateModified: (story as any).lastChapterAt || story.updatedAt || undefined,
        genre: ((story as any).storyCategories || [])
          .map((sc: any) => sc?.category?.name)
          .filter(Boolean),
        keywords: ((story as any).tags || []).join(', ') || undefined,
        ...(story.ratingCount && story.ratingCount > 0 && story.rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(story.rating).toFixed(1),
                ratingCount: story.ratingCount,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      }
    : null;

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <JsonLd data={bookLd ? [bookLd, breadcrumb] : breadcrumb} />
      <StoryDetailClient />
    </Hydrate>
  );
}
