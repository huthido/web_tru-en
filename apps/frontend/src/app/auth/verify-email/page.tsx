'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token xác thực không hợp lệ');
        return;
      }

      try {
        // Call verification endpoint. apiClient unwraps the { success, data }
        // envelope, so response.data is the payload: { ...tokens, user, message }.
        const response = await apiClient.get(`/auth/verify-email?token=${token}`);
        const payload: any = response.data ?? {};

        // Reaching here without throwing means HTTP 2xx → verification succeeded.
        if (payload.user) {
          queryClient.setQueryData(['auth', 'me'], payload.user);
        }

        setStatus('success');
        setMessage(payload.message || 'Xác thực email thành công!');

        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.replace('/');
        }, 2000);
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Có lỗi xảy ra khi xác thực email'
        );
      }
    };

    handleVerification();
  }, [searchParams, router, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-4">
      <div className="max-w-md w-full bg-surface-container rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              Đang xác thực email...
            </h1>
            <p className="text-on-surface-variant">
              Vui lòng đợi trong giây lát
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              🎉 Xác thực thành công!
            </h1>
            <p className="text-on-surface-variant mb-4">
              {message}
            </p>
            <p className="text-sm text-on-surface-variant">
              Bạn sẽ được chuyển hướng đến trang chủ...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              ❌ Xác thực thất bại
            </h1>
            <p className="text-on-surface-variant mb-6">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Về trang đăng nhập
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border-2 border-outline-variant hover:border-blue-500 text-on-surface-variant font-medium rounded-lg transition-colors"
              >
                Thử lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
