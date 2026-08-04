import { Metadata } from 'next';
import React from 'react';
import {
  getStoryServer,
  getChapterServer,
  toPlainText,
  truncate,
} from '@/lib/api/server-stories';
import { absoluteUrl } from '@/lib/seo/site-url';

type Props = {
  params: { slug: string; chapterSlug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [story, chapter] = await Promise.all([
    getStoryServer(params.slug),
    getChapterServer(params.slug, params.chapterSlug),
  ]);

  if (!story || !chapter) {
    return {
      title: 'Không tìm thấy chương',
      description: 'Chương không tồn tại, đã bị gỡ hoặc chưa được xuất bản.',
      robots: { index: false, follow: false },
    };
  }

  const chapterUrl = absoluteUrl(`/truyen/${params.slug}/chuong/${params.chapterSlug}`);
  const title = `${chapter.title} - ${story.title}`;
  // content là HTML — phải bỏ thẻ, nếu không description sẽ đầy "<p>", "&nbsp;".
  const plain = toPlainText(chapter.content);
  const description = plain
    ? truncate(plain, 160)
    : `Đọc ${chapter.title} của truyện ${story.title} miễn phí trên YÊU.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      title,
      description,
      url: chapterUrl,
      siteName: 'YÊU',
      images: story.coverImage
        ? [{ url: story.coverImage, width: 600, height: 800, alt: story.title }]
        : undefined,
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: story.coverImage ? [story.coverImage] : undefined,
    },
    alternates: {
      canonical: chapterUrl,
    },
  };
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
