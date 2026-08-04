import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  getStoryServer,
  getChaptersServer,
  getChapterServer,
  toPlainText,
  truncate,
} from '@/lib/api/server-stories';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import ChapterReaderClient from './chapter-reader-client';

export const revalidate = 600;

type Props = { params: { slug: string; chapterSlug: string } };

/**
 * Nạp sẵn truyện + chương + danh sách chương vào cache react-query để nội dung
 * chương nằm ngay trong HTML server trả về (trước đây bot chỉ thấy spinner).
 *
 * Prefetch chạy không kèm cookie nên luôn lấy đúng phiên bản dành cho khách —
 * chương bị khoá sẽ trả về lỗi và client tự fetch lại với phiên đăng nhập.
 */
export default async function ChapterPage({ params }: Props) {
  const { slug, chapterSlug } = params;

  const [story, chapter, chapters] = await Promise.all([
    getStoryServer(slug),
    getChapterServer(slug, chapterSlug),
    getChaptersServer(slug),
  ]);

  const queryClient = new QueryClient();
  if (story) queryClient.setQueryData(['story', slug], story);
  if (chapter) queryClient.setQueryData(['chapter', slug, chapterSlug], chapter);
  if (chapters.length > 0) queryClient.setQueryData(['chapters', slug], chapters);

  const chapterUrl = absoluteUrl(`/truyen/${slug}/chuong/${chapterSlug}`);

  const articleLd =
    story && chapter
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `${chapter.title} - ${story.title}`,
          description: truncate(toPlainText(chapter.content), 200) || undefined,
          url: chapterUrl,
          inLanguage: 'vi',
          image: story.coverImage || undefined,
          datePublished: chapter.createdAt || undefined,
          dateModified: chapter.updatedAt || chapter.createdAt || undefined,
          wordCount: (chapter as any).wordCount || undefined,
          author: {
            '@type': 'Person',
            name: story.authorName || story.author?.displayName || 'YÊU',
          },
          publisher: { '@type': 'Organization', name: 'YÊU', url: absoluteUrl('/') },
          isPartOf: {
            '@type': 'Book',
            name: story.title,
            url: absoluteUrl(`/truyen/${slug}`),
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': chapterUrl },
        }
      : null;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Truyện', item: absoluteUrl('/truyen') },
      ...(story
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: story.title,
              item: absoluteUrl(`/truyen/${slug}`),
            },
          ]
        : []),
      ...(chapter
        ? [{ '@type': 'ListItem', position: 4, name: chapter.title, item: chapterUrl }]
        : []),
    ],
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd data={articleLd ? [articleLd, breadcrumb] : breadcrumb} />
      <ChapterReaderClient />
    </HydrationBoundary>
  );
}
