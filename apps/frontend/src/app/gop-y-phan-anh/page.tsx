import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'gop-y-phan-anh',
    path: '/gop-y-phan-anh',
    fallbackTitle: 'Góp ý & Phản ánh',
    fallbackDescription: 'Kênh tiếp nhận góp ý, phản ánh và khiếu nại của người dùng YÊU.',
  });
}

export default function Page() {
  return <StaticPage slug="gop-y-phan-anh" fallbackTitle="Góp ý & Phản ánh" />;
}
