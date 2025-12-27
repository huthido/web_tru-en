import { Metadata } from 'next';
import React from 'react';
import { apiClient } from '@/lib/api/client';

type Props = {
  params: { slug: string };
};

async function getStory(slug: string) {
  try {
    const response = await apiClient.get(`/stories/${slug}`);
    // Handle ApiResponse wrapper
    if (response.data && response.data.data && typeof response.data.data === 'object') {
      return response.data.data;
    }
    // If direct response
    if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      return response.data;
    }
    return null;
  } catch (error: any) {
    // Only log non-connection errors to reduce noise
    // Connection errors (ECONNREFUSED) are expected when backend is not running
    if (error?.code !== 'ECONNREFUSED' && error?.cause?.code !== 'ECONNREFUSED') {
      console.error('Error fetching story for metadata:', error);
    }
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await getStory(params.slug);

  if (!story) {
    return {
      title: 'Truyện không tìm thấy',
      description: 'Trang truyện không tồn tại',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const storyUrl = `${siteUrl}/books/${story.slug}`;
  const coverImage = story.coverImage || `${siteUrl}/default-cover.jpg`;
  const description = story.description 
    ? (story.description.length > 160 ? story.description.substring(0, 157) + '...' : story.description)
    : `Đọc truyện ${story.title} - ${story.authorName || 'Tác giả'}`;

  const categories = story.storyCategories?.map((sc: any) => sc.category?.name).filter(Boolean).join(', ') || '';
  const keywords = [
    story.title,
    story.authorName,
    ...(categories ? [categories] : []),
    ...(story.tags || []),
  ].filter(Boolean);

  return {
    title: story.title,
    description,
    keywords,
    authors: story.authorName ? [{ name: story.authorName }] : undefined,
    openGraph: {
      type: 'book',
      title: story.title,
      description,
      url: storyUrl,
      siteName: 'Web Truyen Tien Hung',
      images: [
        {
          url: coverImage,
          width: 600,
          height: 800,
          alt: story.title,
        },
      ],
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
      'book:author': story.authorName || '',
      'book:release_date': story.createdAt ? new Date(story.createdAt).toISOString() : '',
    },
  };
}

export default function StoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

