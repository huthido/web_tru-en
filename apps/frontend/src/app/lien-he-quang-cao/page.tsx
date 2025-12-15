'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function ContactAdvertisingPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Liên hệ quảng cáo – Dành cho doanh nghiệp và cá nhân
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> là nền tảng giải trí nội dung số gồm truyện, phim truyện và sách, sở hữu cộng đồng người dùng yêu thích nghệ thuật, giải trí và sáng tạo. Chúng tôi cung cấp các giải pháp quảng cáo linh hoạt, phù hợp cho doanh nghiệp và cá nhân có nhu cầu quảng bá thương hiệu, sản phẩm hoặc dịch vụ đến đúng nhóm khách hàng tiềm năng.
              </p>

              <p>
                Với nhiều hình thức quảng cáo đa dạng như banner, bài viết giới thiệu, tài trợ nội dung, gắn thương hiệu trong truyện – phim – sách, <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> cam kết mang lại hiệu quả truyền thông rõ ràng, minh bạch và tối ưu chi phí. Đội ngũ của chúng tôi sẵn sàng tư vấn giải pháp phù hợp nhất với mục tiêu kinh doanh của bạn.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-6 rounded-r-lg mt-8">
                <p className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📩</span> Liên hệ quảng cáo:
                </p>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <p>
                    <strong className="text-gray-900 dark:text-white">Email:</strong> congtyhungyeu@gmail.com
                  </p>
                  <p>
                    <strong className="text-gray-900 dark:text-white">Hotline/Zalo:</strong> 0349740717
                  </p>
                </div>
              </div>

              <p className="text-center font-semibold text-gray-900 dark:text-white mt-8">
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Kết nối thương hiệu với cộng đồng yêu nghệ thuật và giải trí.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mt-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Thông tin Website
                </h2>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <p>Tổng 1000 người dùng</p>
                  <p>Trên 5.000 người dùng truy cập mỗi tháng</p>
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

