'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { useAuth } from '@/contexts/auth-context';
import { Loading } from '@/components/ui/loading';

export function MaintenanceCheck({
  children,
  initialMaintenanceMode = false,
}: {
  children: React.ReactNode;
  /**
   * Trạng thái bảo trì đọc được từ server (root layout đã gọi getServerSettings).
   * Nhờ nó, lần render đầu (SSR) biết ngay site có đang bảo trì hay không và
   * không phải chặn nội dung để chờ useSettings() chạy ở client.
   */
  initialMaintenanceMode?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: settings, isLoading } = useSettings();
  const { user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Skip maintenance check for maintenance page itself and admin routes
    if (pathname === '/bao-tri' || pathname?.startsWith('/quan-tri')) {
      return;
    }

    // If maintenance mode is enabled
    if (settings?.maintenanceMode) {
      // Allow admin users to access
      if (user?.role === 'ADMIN') {
        return;
      }

      // Redirect to maintenance page
      router.push('/bao-tri');
    } else {
      // If maintenance mode is off but user is on maintenance page, redirect to home
      if (pathname === '/bao-tri') {
        router.push('/');
      }
    }
  }, [settings, isLoading, pathname, user, router]);

  // KHÔNG chặn nội dung trong lúc chờ settings. Trước đây khối này trả về
  // <Loading /> nên mọi trang render trên server (SSR) chỉ có spinner — bot của
  // Google/AdSense không đọc được một chữ nội dung nào của toàn site.
  // Khi chưa có dữ liệu client, tin vào trạng thái server truyền xuống.
  const maintenanceMode = isLoading
    ? initialMaintenanceMode
    : Boolean(settings?.maintenanceMode);

  // If maintenance mode is on and user is not admin, show loading while redirecting
  if (maintenanceMode && user?.role !== 'ADMIN' && pathname !== '/bao-tri') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return <>{children}</>;
}
