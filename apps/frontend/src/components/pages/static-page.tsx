import type { Metadata } from 'next';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverGet } from '@/lib/api/server-api';
import { absoluteUrl } from '@/lib/seo/site-url';
import { toPlainText, truncate } from '@/lib/api/server-stories';
import { PageContent } from './page-content';

/**
 * Trang nội dung tĩnh (giới thiệu, điều khoản, chính sách…) do admin soạn.
 *
 * Nội dung được nạp trên server rồi hydrate xuống <PageContent> — trước đây chỉ
 * fetch ở client nên Googlebot/AdSense thấy các trang này hoàn toàn trống, trong
 * khi đây đúng là nhóm trang họ kiểm tra kỹ nhất (Giới thiệu, Liên hệ, Quyền
 * riêng tư).
 */

const PAGE_REVALIDATE = 3600;

type StaticPage = {
  title?: string;
  description?: string;
  content?: string;
};

async function fetchPage(slug: string): Promise<StaticPage | null> {
  return serverGet<StaticPage>(`/pages/${slug}`, { revalidate: PAGE_REVALIDATE });
}

export async function buildStaticPageMetadata(options: {
  /** Slug bản ghi trong bảng pages (có thể khác đường dẫn URL). */
  slug: string;
  /** Đường dẫn hiển thị, dùng cho canonical. */
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
}): Promise<Metadata> {
  const { slug, path, fallbackTitle, fallbackDescription } = options;
  const page = await fetchPage(slug);

  const title = page?.title || fallbackTitle;
  const description =
    page?.description ||
    truncate(toPlainText(page?.content), 160) ||
    fallbackDescription ||
    `${fallbackTitle} — YÊU, Mạng Xã Hội Giải Trí Nghệ Thuật.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: 'article',
      title,
      description,
      url: absoluteUrl(path),
      siteName: 'YÊU',
      locale: 'vi_VN',
    },
  };
}

export async function StaticPage({
  slug,
  fallbackTitle,
}: {
  slug: string;
  fallbackTitle: string;
}) {
  const page = await fetchPage(slug);

  const queryClient = new QueryClient();
  if (page) queryClient.setQueryData(['page', slug], page);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContent slug={slug} fallbackTitle={fallbackTitle} />
    </HydrationBoundary>
  );
}
