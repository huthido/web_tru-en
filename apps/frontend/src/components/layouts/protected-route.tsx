'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { UserRole } from '@shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // 🔥 CRITICAL: Block redirect khi auth đang resolving
    // CHẶN redirect khi isLoading để tránh loop
    // Chỉ redirect khi auth check hoàn thành và chắc chắn không có auth
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      // 🔥 CHẶN redirect khi auth đang resolving
      if (isLoading) {
        return;
      }

      // Chỉ redirect khi đã chắc chắn không có auth (sau khi auth check hoàn thành)
      if (!isAuthenticated) {
        hasRedirected.current = true;
        router.push('/login');
        return;
      }

      // Check role permission if required
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (user && !roles.includes(user.role as UserRole)) {
          hasRedirected.current = true;
          router.push('/');
          return;
        }
      }
    }, 100); // Đợi 100ms để đảm bảo auth state đã được update

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [isAuthenticated, isLoading, user, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (user && !roles.includes(user.role as UserRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-on-surface">Không có quyền truy cập</h1>
            <p className="mt-2 text-on-surface-variant">Bạn không có quyền truy cập trang này.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

