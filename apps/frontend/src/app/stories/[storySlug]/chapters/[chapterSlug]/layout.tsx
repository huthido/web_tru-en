import { Metadata } from 'next';
import React from 'react';
import { apiClient } from '@/lib/api/client';

type Props = {
  params: { storySlug: string; chapterSlug: string };
};

async function getStoryAndChapter(storySlug: string, chapterSlug: string) {
  try {
    // Add timeout for production builds
    // If API is not available during build, this will timeout gracefully
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
    // In production, if API is not available during build, return null
    // Client-side will handle the error display
    // Only log non-connection errors to reduce noise
    if (error?.code !== 'ECONNREFUSED' && 
        error?.cause?.code !== 'ECONNREFUSED' && 
        error?.name !== 'AbortError' &&
        error?.code !== 'ETIMEDOUT') {
      console.error('Error fetching story/chapter for metadata:', error);
    }
    // Return null to let client-side handle the error
    return { story: null, chapter: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { story, chapter } = await getStoryAndChapter(params.storySlug, params.chapterSlug);

  // If data is not available (e.g., during build or API unavailable),
  // return a generic title instead of error message
  // Client-side will handle the actual error display
  if (!story || !chapter) {
    return {
      title: `Chương ${params.chapterSlug} - ${params.storySlug}`,
      description: 'Đang tải nội dung chương...',
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
      siteName: 'Web Truyện HungYeu',
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

