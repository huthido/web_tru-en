'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Ủng hộ HÙNG YÊU
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> rất mong nhận được sự ủng hộ từ cộng đồng, doanh nghiệp và những người yêu nghệ thuật để cùng chúng tôi thực hiện các dự án làm phim, viết truyện, sáng tác sách và phát triển nội dung giải trí mang giá trị nhân văn. Mỗi sự ủng hộ của bạn đều là nguồn động viên to lớn, giúp các tác giả và nhà sáng tạo có thêm điều kiện để nuôi dưỡng đam mê và cho ra đời những tác phẩm chất lượng.
              </p>

              <p>
                Sự đồng hành của bạn không chỉ góp phần phát triển nền tảng <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong>, mà còn chung tay lan tỏa nghệ thuật, cảm xúc và giá trị tinh thần tích cực đến cộng đồng.
              </p>

              <p className="text-center">
                <span className="text-red-500 text-lg">❤️</span> <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Trân trọng mọi sự ủng hộ, cùng nhau kiến tạo những tác phẩm chạm đến tâm hồn.
              </p>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Thông tin ủng hộ
                </h2>
                
                {/* QR Code */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white p-2">
                    <Image
                      src="/ungho.jpg"
                      alt="Mã QR ủng hộ"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 256px, 320px"
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
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

