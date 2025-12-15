'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bản quyền
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> cam kết tôn trọng và bảo vệ tuyệt đối quyền sở hữu trí tuệ đối với mọi nội dung được đăng tải trên nền tảng, bao gồm truyện, kịch bản phim, phim truyện, sách và các tác phẩm sáng tạo khác. Tất cả tác giả khi tham gia đều được ghi nhận quyền tác giả theo đúng quy định của pháp luật.
              </p>

              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-6 rounded-r-lg mt-8">
                <p className="font-semibold text-gray-900 dark:text-white mb-4">
                  Nghiêm cấm
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Mọi hành vi sao chép, chỉnh sửa, phát tán, khai thác hoặc sử dụng nội dung trên <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> dưới bất kỳ hình thức nào khi chưa có sự đồng ý bằng văn bản từ tác giả và/hoặc <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong>. Mọi trường hợp vi phạm bản quyền sẽ được xử lý theo quy định pháp luật hiện hành.
                </p>
              </div>

              <p>
                Nếu phát hiện nội dung vi phạm bản quyền hoặc có khiếu nại liên quan đến quyền sở hữu trí tuệ, vui lòng liên hệ với chúng tôi để được tiếp nhận và giải quyết kịp thời.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-6 rounded-r-lg mt-8">
                <p className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📩</span> Liên hệ bản quyền:
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
                👉 <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Tôn trọng sáng tạo, bảo vệ giá trị bản quyền.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

