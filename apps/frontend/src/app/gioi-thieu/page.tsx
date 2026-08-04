import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'gioi-thieu',
    path: '/gioi-thieu',
    fallbackTitle: 'Giới thiệu',
    fallbackDescription: 'Giới thiệu về YÊU — nền tảng đọc và đăng truyện của cộng đồng tác giả Việt.',
  });
}

export default function Page() {
  return <StaticPage slug="gioi-thieu" fallbackTitle="Giới thiệu" />;
}
