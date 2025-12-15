'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';

export default function PartnershipPage() {
  return (
    <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-[120px] pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Đối tác hợp tác
            </h1>

            <div className="mt-8 space-y-6 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> mong muốn hợp tác cùng các đối tác, doanh nghiệp và cá nhân hoạt động trong lĩnh vực sáng tạo nội dung, xuất bản, truyền thông, quảng cáo, công nghệ và giải trí. Chúng tôi hướng tới xây dựng mối quan hệ hợp tác lâu dài, minh bạch và cùng phát triển, dựa trên giá trị sáng tạo và lợi ích bền vững cho các bên.
              </p>

              <p>
                Các hình thức hợp tác tại <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> bao gồm: đồng sản xuất truyện, phim, sách; phát hành và phân phối nội dung; tài trợ – quảng bá thương hiệu; hợp tác truyền thông và phát triển nền tảng công nghệ. Với cộng đồng người dùng ngày càng mở rộng và định hướng phát triển rõ ràng, <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> là cầu nối giúp đối tác tiếp cận hiệu quả thị trường và lan tỏa giá trị đến công chúng.
              </p>

              <p className="text-center font-semibold text-gray-900 dark:text-white">
                🤝 <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> – Hợp tác cùng phát triển, sáng tạo cùng tương lai.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-6 rounded-r-lg mt-8">
                <p className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📩</span> Liên hệ hợp tác cùng nhau phát triển.
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

              <p className="text-center text-gray-700 dark:text-gray-300 mt-6">
                Các dự án truyện, phim, sách thuộc <strong className="text-gray-900 dark:text-white">HÙNG YÊU</strong> rất cần các đối tác hợp tác cùng nhau phát triển. Cảm ơn các đối tác.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

