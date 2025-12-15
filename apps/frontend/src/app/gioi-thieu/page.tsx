'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Giới thiệu
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> là nền tảng giải trí số cung cấp truyện chữ, truyện tranh, phim truyện và sách đọc dành cho mọi lứa tuổi. Chúng tôi mang sứ mệnh đưa nghệ thuật, câu chuyện và giá trị tinh thần đến gần hơn với cộng đồng, tạo nên không gian giải trí lành mạnh, sáng tạo và giàu cảm xúc. <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> hướng đến việc kết nối tâm hồn con người thông qua từng trang truyện, từng thước phim và từng tác phẩm văn học.
              </p>

              <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-l-4 border-pink-500 dark:border-pink-400 p-6 rounded-r-lg mt-8">
                <p className="text-center text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                  CÙNG NHAU XÂY DỰNG CỘNG ĐỒNG YÊU ĐỜI, YÊU CON NGƯỜI, YÊU NGHỆ THUẬT, YÊU TRUYỆN, YÊU PHIM, YÊU SÁCH…XIN TRÂN THÀNH CẢM ƠN
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

