'use client';

import { Camera } from 'lucide-react';

export default function PostsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Camera size={36} className="text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-on-surface">Mày tao</h1>
      <p className="text-on-surface-variant max-w-sm">
        Đăng ảnh, chia sẻ khoảnh khắc và kết nối với cộng đồng. Tính năng đang được phát triển.
      </p>
    </div>
  );
}
