import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'terms',
    path: '/dieu-khoan',
    fallbackTitle: 'Điều khoản & Điều kiện',
    fallbackDescription: 'Điều khoản sử dụng dịch vụ đọc và đăng truyện trên YÊU.',
  });
}

export default function Page() {
  return <StaticPage slug="terms" fallbackTitle="Điều khoản & Điều kiện" />;
}
