'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function AuthorRegistrationPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Đăng ký tác giả
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> trân trọng chào đón các tác giả viết truyện, kịch bản phim và sách ở mọi thể loại – từ sáng tác giải trí, nghệ thuật đến những tác phẩm mang giá trị nhân văn và chiều sâu cảm xúc. Khi đăng ký trở thành tác giả của <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong>, bạn sẽ có cơ hội đưa tác phẩm của mình đến với cộng đồng độc giả rộng lớn thông qua nền tảng đọc truyện, xem phim truyện và đọc sách hiện đại, chuyên nghiệp.
              </p>

              <p>
                Chúng tôi cam kết tôn trọng bản quyền, minh bạch trong hợp tác, hỗ trợ quảng bá tác phẩm và tạo môi trường sáng tạo bền vững để mỗi tác giả yên tâm phát triển con đường nghệ thuật của mình. <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> không chỉ là nơi đăng tải tác phẩm, mà còn là ngôi nhà chung nuôi dưỡng đam mê sáng tác và lan tỏa giá trị tinh thần tích cực đến cộng đồng.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-6 rounded-r-lg mt-8">
                <p className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📩</span> Gửi CV và thông tin cho chúng tôi. Cảm ơn bạn
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
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Đồng hành cùng tác giả, lan tỏa nghệ thuật đến tâm hồn mọi người
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

