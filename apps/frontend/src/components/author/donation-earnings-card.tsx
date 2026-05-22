'use client';

import { useEffect, useState } from 'react';
import { Coins, TrendingUp, Info } from 'lucide-react';
import { WalletService, MyDonationEarnings } from '@/lib/api/wallet.service';

/**
 * Author-facing widget showing donation revenue: total received (net),
 * gross paid by donors, platform fee deducted, and the current fee rate.
 *
 * Hits GET /api/wallet/donations/me — auth-required, returns the breakdown
 * that is hidden from public profile stats.
 */
export function DonationEarningsCard() {
  const [data, setData] = useState<MyDonationEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    WalletService.getMyDonationEarnings()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Không tải được thu nhập donate');
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

  const { totalGross, totalNet, totalPlatformFee, platformFeePercent, donationCount } = data;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-5 shadow-sm border border-amber-200 dark:border-amber-800/40 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Thu nhập từ ủng hộ
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {donationCount.toLocaleString()} lượt ủng hộ · phí nền tảng hiện tại {platformFeePercent}%
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
          <p className="text-xs text-on-surface-variant mb-1">Tổng donor đã trả (gross)</p>
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
          Người ủng hộ thấy đầy đủ số coin họ đã donate; phí được trừ tự động trước khi cộng vào ví của bạn.
          Các donation cũ giữ nguyên mức phí ở thời điểm phát sinh, không bị tính lại khi admin thay đổi tỷ lệ.
        </span>
      </p>
    </div>
  );
}
