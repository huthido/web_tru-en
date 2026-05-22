import type { ReactNode } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';

/**
 * Layout cho toàn bộ khu /admin. Đặt AdminLayout (header + sidebar) ở đây thay
 * vì trong từng page.tsx -> Next.js GIỮ NGUYÊN layout khi điều hướng giữa các
 * trang admin: sidebar/header không re-mount nên vị trí cuộn được giữ, không
 * còn nháy mỗi lần chuyển trang.
 */
export default function AdminSectionLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
