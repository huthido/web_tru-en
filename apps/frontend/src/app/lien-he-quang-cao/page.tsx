import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'lien-he-quang-cao',
    path: '/lien-he-quang-cao',
    fallbackTitle: 'Liên hệ quảng cáo',
    fallbackDescription: 'Thông tin liên hệ đặt quảng cáo và hợp tác truyền thông trên YÊU.',
  });
}

export default function Page() {
  return <StaticPage slug="lien-he-quang-cao" fallbackTitle="Liên hệ quảng cáo" />;
}
