'use client';

import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useMyMonetizationEligibility } from '@/lib/api/hooks/use-monetization';
import { Loading } from '@/components/ui/loading';
import { Eye, Users, ShieldCheck, FileCheck2, ArrowRight, Check, X, Megaphone, Coins, Crown, BadgeCheck } from 'lucide-react';

/**
 * Trang tiến độ mở khoá TÍNH NĂNG NÂNG CAO — theo
 * docs/Điều Kiện Bật Kiếm Tiền.docx.
 *
 * Donate / bán nội dung đã tạo: tự do cho mọi tác giả. Đủ 4 điều kiện
 * dưới đây sẽ unlock 4 quyền lợi: ads revenue, paid chapter, VIP story,
 * verified badge ✓.
 */
export default function AuthorEligibilityPage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useMyMonetizationEligibility(isAuthenticated);

  if (!isAuthenticated) {
    return <ProtectedRoute><div /></ProtectedRoute>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-60 pb-16 md:pb-0">
          <Header />
          <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface">
                  Mở khoá tính năng nâng cao
                </h1>
                <p className="text-on-surface-variant mt-1">
                  Donate và rút xu đã mở tự do cho mọi tác giả. Đạt đủ 4 điều kiện bên dưới để mở thêm các quyền lợi nâng cao.
                </p>
              </div>

              {/* Quyền lợi sẽ được mở */}
              <div className="bg-surface-container rounded-xl p-5 md:p-6 mb-6 border border-outline-variant">
                <h2 className="font-semibold text-on-surface mb-3">Quyền lợi khi đủ điều kiện</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
                    Nhận xu từ quảng cáo trong truyện
                  </li>
                  <li className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary flex-shrink-0" />
                    Đặt giá coin cho chương (FREEMIUM)
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary flex-shrink-0" />
                    Bán truyện VIP (mua 1 lần đọc cả truyện)
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                    Tick xanh ✓ + ưu tiên hiển thị
                  </li>
                </ul>
              </div>

              {isLoading || !data ? (
                <div className="py-20"><Loading /></div>
              ) : (
                <>
                  {data.eligible && (
                    <div className="mb-6 rounded-xl border border-primary bg-primary/10 p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-on-surface">Chúc mừng!</h3>
                        <p className="text-sm text-on-surface-variant mt-1">
                          Bạn đã đủ điều kiện — 4 quyền lợi nâng cao đã được mở khoá.
                        </p>
                      </div>
                      <Link
                        href="/author/earnings"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors flex-shrink-0"
                      >
                        Vào Trung tâm Kiếm tiền
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProgressCard
                      icon={<Eye className="w-5 h-5" />}
                      title="Tổng lượt xem"
                      current={data.progress.totalViews.current}
                      required={data.progress.totalViews.required}
                      ok={data.criteria.totalViews}
                    />
                    <ProgressCard
                      icon={<Users className="w-5 h-5" />}
                      title="Người theo dõi tác giả"
                      current={data.progress.followers.current}
                      required={data.progress.followers.required}
                      ok={data.criteria.followers}
                    />
                    <BinaryCard
                      icon={<ShieldCheck className="w-5 h-5" />}
                      title="Tài khoản không vi phạm"
                      ok={data.criteria.accountOk}
                      okMessage="Tài khoản đang hoạt động bình thường"
                      failMessage={data.reasons?.accountOk ?? 'Có báo cáo vi phạm gần đây'}
                    />
                    <BinaryCard
                      icon={<FileCheck2 className="w-5 h-5" />}
                      title="Nội dung không vi phạm"
                      ok={data.criteria.contentOk}
                      okMessage="Không có nội dung bị xử lý vi phạm"
                      failMessage={data.reasons?.contentOk ?? 'Có nội dung bị xử lý vi phạm gần đây'}
                    />
                  </div>

                  <p className="text-xs text-on-surface-variant mt-6">
                    Tiêu chí tài khoản / nội dung tính trong cửa sổ 90 ngày gần nhất. Nếu bạn nhận được báo cáo vi phạm đã được xử lý, sau 90 ngày trạng thái sẽ tự khôi phục.
                  </p>
                </>
              )}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
}

interface ProgressCardProps {
  icon: React.ReactNode;
  title: string;
  current: number;
  required: number;
  ok: boolean;
}

function ProgressCard({ icon, title, current, required, ok }: ProgressCardProps) {
  const pct = Math.min(100, Math.round((current / required) * 100));
  return (
    <div className={`rounded-xl border p-5 ${ok ? 'border-primary/40 bg-primary/5' : 'border-outline-variant bg-surface-container'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
          {ok ? <Check className="w-5 h-5" /> : icon}
        </div>
        <h3 className="font-semibold text-on-surface text-sm md:text-base">{title}</h3>
      </div>
      <p className="font-display text-2xl font-bold text-on-surface">
        {current.toLocaleString('vi-VN')}
        <span className="text-base font-medium text-on-surface-variant"> / {required.toLocaleString('vi-VN')}</span>
      </p>
      <div className="mt-3 h-2 rounded-full bg-surface-variant overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface BinaryCardProps {
  icon: React.ReactNode;
  title: string;
  ok: boolean;
  okMessage: string;
  failMessage: string;
}

function BinaryCard({ icon, title, ok, okMessage, failMessage }: BinaryCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${ok ? 'border-primary/40 bg-primary/5' : 'border-error/40 bg-error/5'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-primary text-on-primary' : 'bg-error text-on-error'}`}>
          {ok ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </div>
        <h3 className="font-semibold text-on-surface text-sm md:text-base">{title}</h3>
      </div>
      <p className="text-sm text-on-surface-variant">{ok ? okMessage : failMessage}</p>
    </div>
  );
}
