import { Metadata } from 'next';
import React from 'react';
import { getStoryServer, getChaptersServer, truncate } from '@/lib/api/server-stories';
import { absoluteUrl } from '@/lib/seo/site-url';
import { isIndexableStory } from '@/lib/seo/indexing';

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [story, chapters] = await Promise.all([
    getStoryServer(params.slug),
    getChaptersServer(params.slug),
  ]);

  if (!story) {
    return {
      title: 'Không tìm thấy truyện',
      description: 'Truyện không tồn tại, đã bị gỡ hoặc chưa được xuất bản.',
      robots: { index: false, follow: false },
    };
  }

  const storyUrl = absoluteUrl(`/truyen/${story.slug}`);
  const coverImage = story.coverImage || absoluteUrl('/default-cover.jpg');
  const authorName = story.authorName || story.author?.displayName || 'Tác giả';
  const description = story.description
    ? truncate(story.description, 160)
    : `Đọc truyện ${story.title} của ${authorName} miễn phí trên YÊU.`;

  const categories = (story.storyCategories || [])
    .map((sc) => sc?.category?.name)
    .filter(Boolean) as string[];

  // Truyện quá ít chương công khai thì không đáng index (Google xếp vào "thin
  // content"). Vẫn để `follow` để bot đi tiếp link bên trong, không cắt luồng crawl.
  const shouldIndex = isIndexableStory(chapters.length);

  return {
    title: story.title,
    description,
    keywords: [story.title, authorName, ...categories, ...(story.tags || [])].filter(Boolean),
    authors: [{ name: authorName }],
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: 'book',
      title: story.title,
      description,
      url: storyUrl,
      siteName: 'YÊU',
      images: [{ url: coverImage, width: 600, height: 800, alt: story.title }],
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description,
      images: [coverImage],
    },
    alternates: {
      canonical: storyUrl,
    },
    other: {
      'book:author': authorName,
      'book:release_date': story.createdAt ? new Date(story.createdAt).toISOString() : '',
    },
  };
}

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
