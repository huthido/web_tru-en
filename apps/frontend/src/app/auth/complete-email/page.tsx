'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth.service';
import Link from 'next/link';

export default function CompleteEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      router.push('/login');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setIsSubmitting(true);

    try {
      const code = searchParams.get('code');
      if (!code) {
        throw new Error('Code is missing');
      }

      // Complete email with code (cookies will be set by backend)
      await authService.completeEmail(code, email);

      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify auth by calling getMe
      const response = await authService.getMe();
      if (response?.data?.user) {
        queryClient.setQueryData(['auth', 'me'], response.data.user);
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        throw new Error('Failed to get user data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {!isSuccess ? (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Hoàn tất đăng nhập
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Facebook của bạn không có email. Vui lòng nhập email để hoàn tất đăng nhập.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Thành công!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Email đã được cập nhật. Đang chuyển hướng...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
