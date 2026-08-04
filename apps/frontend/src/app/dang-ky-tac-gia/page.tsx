import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'dang-ky-tac-gia',
    path: '/dang-ky-tac-gia',
    fallbackTitle: 'Đăng ký tác giả',
    fallbackDescription: 'Hướng dẫn đăng ký trở thành tác giả và đăng truyện trên YÊU.',
  });
}

export default function Page() {
  return <StaticPage slug="dang-ky-tac-gia" fallbackTitle="Đăng ký tác giả" />;
}
