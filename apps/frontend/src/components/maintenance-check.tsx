'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { useAuth } from '@/contexts/auth-context';
import { Loading } from '@/components/ui/loading';

export function MaintenanceCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: settings, isLoading } = useSettings();
  const { user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Skip maintenance check for maintenance page itself and admin routes
    if (pathname === '/maintenance' || pathname?.startsWith('/admin')) {
      return;
    }

    // If maintenance mode is enabled
    if (settings?.maintenanceMode) {
      // Allow admin users to access
      if (user?.role === 'ADMIN') {
        return;
      }

      // Redirect to maintenance page
      router.push('/maintenance');
    } else {
      // If maintenance mode is off but user is on maintenance page, redirect to home
      if (pathname === '/maintenance') {
        router.push('/');
      }
    }
  }, [settings, isLoading, pathname, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // If maintenance mode is on and user is not admin, show loading while redirecting
  if (settings?.maintenanceMode && user?.role !== 'ADMIN' && pathname !== '/maintenance') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return <>{children}</>;
}
