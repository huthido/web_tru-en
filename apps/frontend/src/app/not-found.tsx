'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-outline-variant">404</h1>
        </div>
        <h2 className="text-3xl font-bold text-on-surface mb-4">
          Trang không tìm thấy
        </h2>
        <p className="text-on-surface-variant mb-8">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-surface-variant text-on-surface rounded-lg hover:bg-surface-variant transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
