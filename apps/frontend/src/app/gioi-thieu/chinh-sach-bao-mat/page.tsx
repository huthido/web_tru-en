import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return Promise.resolve({
    title: 'Chính sách bảo mật',
    description: 'Cách YÊU thu thập, sử dụng và bảo vệ dữ liệu người dùng.',
    robots: { index: true, follow: true },
  });
}

export default function Page() {
  redirect('/quyen-rieng-tu');
}
