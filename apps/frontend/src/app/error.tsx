'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-on-surface mb-4">
          Đã xảy ra lỗi
        </h2>
        <p className="text-on-surface-variant mb-6">
          {error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.'}
        </p>
        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
            <p className="text-xs text-red-800 dark:text-red-200 font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-surface-variant text-on-surface rounded-lg hover:bg-surface-variant transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

