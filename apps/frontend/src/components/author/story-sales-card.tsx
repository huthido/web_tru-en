'use client';

import { useEffect, useState } from 'react';
import { Crown, Info } from 'lucide-react';
import { WalletService, MyStorySales } from '@/lib/api/wallet.service';

/**
 * Author-facing widget showing VIP story-sales revenue: total received (net),
 * gross paid by buyers, platform fee deducted, and the current fee rate.
 * Hits GET /api/wallet/story-sales/me.
 */
export function StorySalesEarningsCard() {
  const [data, setData] = useState<MyStorySales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    WalletService.getMyStorySales()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Không tải được thu nhập bán truyện');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // silently hide on error — non-critical widget
  }

  const { totalGross, totalNet, totalPlatformFee, platformFeePercent, salesCount } = data;

  // Hide until the author has at least one VIP story sale.
  if (salesCount === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-lg p-5 shadow-sm border border-purple-200 dark:border-purple-800/40 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-600" />
            Thu nhập từ bán truyện VIP
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {salesCount.toLocaleString()} lượt mua · phí nền tảng hiện tại {platformFeePercent}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/70 dark:bg-gray-800/60 rounded p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bạn nhận (net)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalNet.toLocaleString()} <span className="text-sm font-normal">coin</span>
          </p>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/60 rounded p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tổng người mua đã trả (gross)</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {totalGross.toLocaleString()} <span className="text-sm font-normal">coin</span>
          </p>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/60 rounded p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Phí nền tảng</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
            {totalPlatformFee.toLocaleString()} <span className="text-sm font-normal">coin</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Người đọc trả giá bạn đặt cho truyện VIP; phí nền tảng được trừ tự động trước khi cộng vào ví của bạn.
        </span>
      </p>
    </div>
  );
}
