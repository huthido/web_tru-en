'use client';

import { useEffect, useState } from 'react';
import { BookLock, Info } from 'lucide-react';
import { WalletService, MyChapterSales } from '@/lib/api/wallet.service';

/**
 * Author-facing widget showing chapter-sales revenue: total received (net),
 * gross paid by buyers, platform fee deducted, and the current fee rate.
 *
 * Hits GET /api/wallet/chapter-sales/me — auth-required, returns the breakdown
 * for paid chapters the author owns.
 */
export function ChapterSalesEarningsCard() {
  const [data, setData] = useState<MyChapterSales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    WalletService.getMyChapterSales()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Không tải được thu nhập bán chương');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-container rounded-lg p-6 shadow-sm border border-outline-variant mb-6">
        <div className="h-5 bg-surface-variant rounded w-48 animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-surface-container-high rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // silently hide on error — non-critical widget
  }

  const { totalGross, totalNet, totalPlatformFee, platformFeePercent, salesCount } = data;

  // Hide entirely until the author has at least one paid-chapter sale, to avoid
  // an empty zero-card cluttering the dashboard.
  if (salesCount === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-lg p-5 shadow-sm border border-sky-200 dark:border-sky-800/40 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <BookLock className="w-5 h-5 text-sky-600" />
            Thu nhập từ bán chương
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {salesCount.toLocaleString()} lượt mua · phí nền tảng hiện tại {platformFeePercent}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-container/70/60 rounded p-3">
          <p className="text-xs text-on-surface-variant mb-1">Bạn nhận (net)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalNet.toLocaleString()} <span className="text-sm font-normal">coin</span>
          </p>
        </div>
        <div className="bg-surface-container/70/60 rounded p-3">
          <p className="text-xs text-on-surface-variant mb-1">Tổng người mua đã trả (gross)</p>
          <p className="text-xl font-bold text-on-surface">
            {totalGross.toLocaleString()} <span className="text-sm font-normal">coin</span>
          </p>
        </div>
        <div className="bg-surface-container/70/60 rounded p-3">
          <p className="text-xs text-on-surface-variant mb-1">Phí nền tảng</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
            {totalPlatformFee.toLocaleString()} <span className="text-sm font-normal">coin</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-on-surface-variant mt-3 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Người đọc trả số coin bạn đặt cho chương; phí nền tảng được trừ tự động trước khi cộng vào ví của bạn.
          Các lượt mua cũ giữ nguyên mức phí ở thời điểm phát sinh, không bị tính lại khi admin thay đổi tỷ lệ.
        </span>
      </p>
    </div>
  );
}
