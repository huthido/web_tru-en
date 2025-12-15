'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Góp ý phản ánh
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> luôn trân trọng mọi ý kiến đóng góp và phản ánh từ người dùng, tác giả, đối tác và cộng đồng. Những chia sẻ của bạn là cơ sở quan trọng giúp chúng tôi không ngừng hoàn thiện nền tảng, nâng cao chất lượng nội dung, dịch vụ và trải nghiệm người dùng.
              </p>

              <p>
                Nếu bạn có góp ý, phản ánh, khiếu nại hoặc đề xuất cải tiến, vui lòng liên hệ với <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> qua các kênh hỗ trợ chính thức. Chúng tôi cam kết tiếp nhận, xem xét và phản hồi một cách nghiêm túc, minh bạch và trong thời gian sớm nhất.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-6 rounded-r-lg mt-8">
                <p className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📩</span> Kênh tiếp nhận góp ý – phản ánh:
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
                👉 <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Lắng nghe để phát triển, đồng hành cùng cộng đồng.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

