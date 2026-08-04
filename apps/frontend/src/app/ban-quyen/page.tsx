import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'ban-quyen',
    path: '/ban-quyen',
    fallbackTitle: 'Bản quyền',
    fallbackDescription: 'Chính sách bản quyền và quy trình xử lý khiếu nại vi phạm nội dung trên YÊU.',
  });
}

export default function Page() {
  return <StaticPage slug="ban-quyen" fallbackTitle="Bản quyền" />;
}
