'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Token được set trong cookie từ backend qua CookieInterceptor
      // Invalidate auth query để fetch user mới
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      
      setStatus('success');
      // Redirect về home sau 1 giây
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      // Nếu không có token, có thể là lỗi hoặc user đã cancel
      setStatus('error');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [searchParams, router, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Đang xử lý đăng nhập...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4">
              <svg className="w-full h-full text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-medium">Đăng nhập thành công!</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Đang chuyển hướng...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4">
              <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-medium">Đăng nhập thất bại</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Đang chuyển về trang đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
}

