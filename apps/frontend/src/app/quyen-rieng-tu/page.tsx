import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'privacy',
    path: '/quyen-rieng-tu',
    fallbackTitle: 'Chính sách bảo mật',
    fallbackDescription: 'Cách YÊU thu thập, sử dụng và bảo vệ dữ liệu người dùng, bao gồm cookie và quảng cáo của bên thứ ba.',
  });
}

export default function Page() {
  return <StaticPage slug="privacy" fallbackTitle="Chính sách bảo mật" />;
}
