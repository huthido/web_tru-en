'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Loading } from '@/components/ui/loading';

export default function MaintenancePage() {
  const { data: settings, isLoading } = useSettings();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isLoading && settings && !settings.maintenanceMode) {
      // If maintenance mode is off, redirect to home
      window.location.href = '/';
    }
  }, [settings, isLoading]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto refresh after countdown
      window.location.reload();
    }
  }, [countdown]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-32 w-32 text-yellow-500 dark:text-yellow-400"
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
        <h1 className="text-4xl md:text-5xl font-bold text-on-surface mb-6">
          Website đang bảo trì
        </h1>
        <p className="text-xl md:text-2xl text-on-surface-variant mb-8">
          {settings?.maintenanceMessage || 'Chúng tôi đang thực hiện bảo trì hệ thống để cải thiện trải nghiệm của bạn.'}
        </p>
        <div className="bg-surface-container rounded-lg p-6 shadow-lg mb-8">
          <p className="text-on-surface-variant mb-4">
            Chúng tôi sẽ quay lại sớm. Vui lòng thử lại sau.
          </p>
          <p className="text-sm text-on-surface-variant">
            Tự động làm mới sau {countdown} giây...
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Làm mới trang
        </button>
      </div>
    </div>
  );
}
