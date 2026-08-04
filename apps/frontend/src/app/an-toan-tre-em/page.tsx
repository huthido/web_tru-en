import type { Metadata } from 'next';
import { StaticPage, buildStaticPageMetadata } from '@/components/pages/static-page';

// Nội dung do admin soạn, đổi không thường xuyên — cache 1 giờ.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    slug: 'child-safety',
    path: '/an-toan-tre-em',
    fallbackTitle: 'Tiêu chuẩn an toàn cho trẻ em',
    fallbackDescription: 'Cam kết và tiêu chuẩn của YÊU về an toàn cho trẻ em trên nền tảng.',
  });
}

export default function Page() {
  return <StaticPage slug="child-safety" fallbackTitle="Tiêu chuẩn an toàn cho trẻ em" />;
}
