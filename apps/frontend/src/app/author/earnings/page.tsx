'use client';

import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { useMyMonetizationEligibility } from '@/lib/api/hooks/use-monetization';
import { TodayEarningsCard } from '@/components/author/today-earnings-card';
import { DonationEarningsCard } from '@/components/author/donation-earnings-card';
import { ChapterSalesEarningsCard } from '@/components/author/chapter-sales-card';
import { StorySalesEarningsCard } from '@/components/author/story-sales-card';
import { Wallet, ArrowUpRight, LayoutDashboard, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Trung tâm Kiếm tiền — gom toàn bộ thu nhập của tác giả vào một nơi
 * (theo mockup Stitch `mangahub_trung_t_m_ki_m_ti_n`): số dư ví + rút xu
 * + các thẻ doanh thu (hôm nay, donate, bán chương, bán truyện VIP).
 */
export default function AuthorEarningsPage() {
  const { isAuthenticated } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWalletBalance(isAuthenticated);
  // Mọi tác giả đều xem được Trung tâm Kiếm tiền. Eligibility chỉ ảnh hưởng
  // tính năng nâng cao (ads / paid content / verified) — không gate trang này.
  const { data: eligibility } = useMyMonetizationEligibility(isAuthenticated);
  const showUpgradeBanner = eligibility && !eligibility.eligible;

  if (!isAuthenticated) {
    return <ProtectedRoute><div /></ProtectedRoute>;
  }

  const earned = wallet?.earnedBalance ?? 0;
  const purchased = wallet?.purchasedBalance ?? 0;
  const total = earned + purchased;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface transition-colors duration-300">
        <Sidebar />
        <div className="md:ml-60 pb-16 md:pb-0">
          <Header />
          <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Tiêu đề trang */}
              <div className="mb-6">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface">
                  Trung tâm Kiếm tiền
                </h1>
                <p className="text-on-surface-variant mt-1">
                  Quản lý thu nhập và rút xu từ sáng tác của bạn.
                </p>
              </div>

              {/* Banner mời mở khoá tính năng nâng cao (ads, paid chapter, VIP, verified) */}
              {showUpgradeBanner && (
                <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-on-surface">
                        Mở khoá thêm tính năng nâng cao
                      </h3>
                      <p className="text-sm text-on-surface-variant mt-1">
                        Nhận xu từ quảng cáo, bán chương trả phí, truyện VIP, và gắn tick xanh ✓.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/author/eligibility"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors flex-shrink-0"
                  >
                    Xem điều kiện
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Ví số dư + nút rút xu */}
              <div className="bg-surface-container rounded-xl p-6 md:p-8 mb-6 shadow-sm border border-outline-variant">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-on-surface-variant mb-1.5">
                      <Wallet className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">Xu đã kiếm — có thể rút</span>
                    </div>
                    {walletLoading ? (
                      <div className="h-11 w-44 bg-surface-variant rounded animate-pulse" />
                    ) : (
                      <p className="font-display text-4xl font-extrabold text-primary">
                        {earned.toLocaleString('vi-VN')}{' '}
                        <span className="text-lg font-bold text-on-surface-variant">coin</span>
                      </p>
                    )}
                    <p className="text-xs text-on-surface-variant mt-1.5">
                      Tổng số dư ví: {total.toLocaleString('vi-VN')} coin
                      {' · '}
                      {purchased.toLocaleString('vi-VN')} coin đã nạp
                    </p>
                  </div>
                  <Link
                    href="/author/withdrawals"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors flex-shrink-0"
                  >
                    Rút xu
                    <ArrowUpRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Các thẻ doanh thu */}
              <TodayEarningsCard />
              <DonationEarningsCard />
              <ChapterSalesEarningsCard />
              <StorySalesEarningsCard />

              {/* Liên kết về quản lý truyện */}
              <Link
                href="/author/dashboard"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Sang Kênh tác giả — quản lý truyện
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
}
