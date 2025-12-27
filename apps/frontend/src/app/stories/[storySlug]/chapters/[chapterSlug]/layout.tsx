import { Metadata } from 'next';
import React from 'react';
import { apiClient } from '@/lib/api/client';

type Props = {
  params: { storySlug: string; chapterSlug: string };
};

async function getStoryAndChapter(storySlug: string, chapterSlug: string) {
  try {
    const [storyResponse, chaptersResponse] = await Promise.all([
      apiClient.get(`/stories/${storySlug}`),
      apiClient.get(`/stories/${storySlug}/chapters`),
    ]);

    const story = storyResponse.data?.data || storyResponse.data;
    const chapters = Array.isArray(chaptersResponse.data?.data)
      ? chaptersResponse.data.data
      : (Array.isArray(chaptersResponse.data) ? chaptersResponse.data : []);

    const chapter = chapters.find((ch: any) => ch.slug === chapterSlug);

    return { story, chapter };
  } catch (error: any) {
    // Only log non-connection errors to reduce noise
    // Connection errors (ECONNREFUSED) are expected when backend is not running
    if (error?.code !== 'ECONNREFUSED' && error?.cause?.code !== 'ECONNREFUSED') {
      console.error('Error fetching story/chapter for metadata:', error);
    }
    return { story: null, chapter: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { story, chapter } = await getStoryAndChapter(params.storySlug, params.chapterSlug);

  if (!story || !chapter) {
    return {
      title: 'Chương không tìm thấy',
      description: 'Chương truyện không tồn tại',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const chapterUrl = `${siteUrl}/stories/${params.storySlug}/chapters/${params.chapterSlug}`;
  const description = chapter.content
    ? (chapter.content.length > 160 ? chapter.content.substring(0, 157) + '...' : chapter.content)
    : `Đọc ${chapter.title} - ${story.title}`;

  return {
    title: `${chapter.title} - ${story.title}`,
    description,
    openGraph: {
      type: 'article',
      title: `${chapter.title} - ${story.title}`,
      description,
      url: chapterUrl,
      siteName: 'Web Truyen Tien Hung',
      images: story.coverImage ? [
        {
          url: story.coverImage,
          width: 600,
          height: 800,
          alt: story.title,
        },
      ] : undefined,
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${chapter.title} - ${story.title}`,
      description,
      images: story.coverImage ? [story.coverImage] : undefined,
    },
    alternates: {
      canonical: chapterUrl,
    },
  };
}

export default function ChapterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

