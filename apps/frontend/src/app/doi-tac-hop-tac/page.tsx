import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'doi-tac-hop-tac',
    path: '/doi-tac-hop-tac',
    fallbackTitle: 'Đối tác & Hợp tác',
    fallbackDescription: 'Cơ hội hợp tác nội dung và kinh doanh cùng YÊU.',
  });
}

export default function Page() {
  return <StaticPage slug="doi-tac-hop-tac" fallbackTitle="Đối tác & Hợp tác" />;
}
