'use client';

import { Suspense } from 'react';
import { Loading } from '@/components/ui/loading';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { usePage } from '@/lib/api/hooks/use-pages';

function SupportContent() {
  const { data: page, isLoading, error } = usePage('ung-ho');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {page?.title || 'Ủng hộ'}
            </h1>
            {page?.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {page.description}
              </p>
            )}
            <div
              className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: page?.content || '' }}
            />
            
            {/* QR Code Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Thông tin ủng hộ
              </h2>
              
              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white p-2">
                  <OptimizedImage
                    src="/ungho.jpg"
                    alt="Mã QR ủng hộ"
                    fill
                    objectFit="contain"
                    sizes={ImageSizes.qrCode}
                    quality={90}
                    placeholder="blur"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3 text-sm md:text-base text-gray-700 dark:text-gray-300">
                <p>
                  <strong className="text-gray-900 dark:text-white">Rất mong mọi người ghi rõ Họ và Tên cũng như Biệt Danh</strong>
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-r-lg">
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">Lưu ý:</p>
                  <p>Ghi chú ủng hộ vì lý do gì, ủng hộ tác phẩm nào và vì sao</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    (Ví dụ: ủng hộ bộ truyện, phim, sách nào đó để mong phát hành sách hoặc làm phim)
                  </p>
                </div>
                <p className="text-center font-semibold text-gray-900 dark:text-white mt-4">
                  Cảm ơn tất cả mọi người.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    }>
      <SupportContent />
    </Suspense>
  );
}

