'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6 animate-pulse">
                <WifiOff className="w-16 h-16 text-gray-500 dark:text-gray-400" />
            </div>

            <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100">
                Bạn đang Offline
            </h1>

            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                Không có kết nối mạng. Hãy kiểm tra lại đường truyền WiFi hoặc 4G của bạn.
                Bạn vẫn có thể đọc những truyện đã lưu trong máy.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    Thử lại
                </button>

                <Link
                    href="/"
                    className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    Trang chủ
                </Link>
            </div>
        </div>
    );
}
