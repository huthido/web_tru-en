'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { WalletService, MyTodayEarnings } from '@/lib/api/wallet.service';

/**
 * Author-facing "Doanh thu hôm nay" widget (spec mục 17). Net coins earned
 * since local midnight across donations + chapter sales + VIP story sales.
 */
export function TodayEarningsCard() {
  const [data, setData] = useState<MyTodayEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    WalletService.getMyTodayEarnings()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { total, donationNet, chapterNet, storyNet, counts } = data;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-5 shadow-sm border border-emerald-200 dark:border-emerald-800/40 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Doanh thu hôm nay
        </h2>
      </div>
      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
        {total.toLocaleString()} <span className="text-base font-normal">coin</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <span>Ủng hộ: <b className="text-gray-900 dark:text-white">{donationNet.toLocaleString()}</b> ({counts.donations})</span>
        <span>Bán chương: <b className="text-gray-900 dark:text-white">{chapterNet.toLocaleString()}</b> ({counts.chapterSales})</span>
        <span>Bán truyện VIP: <b className="text-gray-900 dark:text-white">{storyNet.toLocaleString()}</b> ({counts.storySales})</span>
      </div>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        Tính từ 0h hôm nay · số coin thực nhận (đã trừ phí nền tảng).
      </p>
    </div>
  );
}
