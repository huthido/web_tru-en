'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth.service';
import { setSessionHint } from '@/lib/api/session-hint';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');

      if (!code) {
        // No code provided, redirect immediately
        setStatus('error');
        router.replace('/login?error=no_code');
        return;
      }

      try {
        // Exchange code for tokens (cookies will be set by backend)
        await authService.exchange(code);

        // Đăng nhập OAuth thành công — bật cờ phiên để useAuth gọi /auth/me
        // (login Google không đi qua loginMutation nên phải set thủ công).
        setSessionHint(true);

        // Wait for cookies to be set
        await new Promise(resolve => setTimeout(resolve, 800));

        // Invalidate all queries to force fresh fetch
        await queryClient.invalidateQueries();

        setStatus('success');
        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 300));
        router.replace('/');
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        // 🔥 FIXED: Redirect immediately, no setTimeout
        router.replace('/login?error=oauth_failed');
      }
    };

    handleAuthCallback();
  }, [searchParams, router, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low transition-colors duration-300">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-on-surface-variant">Đang xử lý đăng nhập...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4">
              <svg className="w-full h-full text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-on-surface font-medium">Đăng nhập thành công!</p>
            <p className="text-on-surface-variant text-sm mt-2">Đang chuyển hướng...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4">
              <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-on-surface font-medium">Đăng nhập thất bại</p>
            <p className="text-on-surface-variant text-sm mt-2">Đang chuyển về trang đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
}

