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
      <div className="bg-surface-container rounded-lg p-5 shadow-sm border border-outline-variant mb-6">
        <div className="h-5 w-40 bg-surface-variant rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-surface-container-high rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { total, donationNet, chapterNet, storyNet, counts } = data;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-5 shadow-sm border border-emerald-200 dark:border-emerald-800/40 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-on-surface">
          Doanh thu hôm nay
        </h2>
      </div>
      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
        {total.toLocaleString()} <span className="text-base font-normal">coin</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-on-surface-variant">
        <span>Ủng hộ: <b className="text-on-surface">{donationNet.toLocaleString()}</b> ({counts.donations})</span>
        <span>Bán chương: <b className="text-on-surface">{chapterNet.toLocaleString()}</b> ({counts.chapterSales})</span>
        <span>Bán truyện VIP: <b className="text-on-surface">{storyNet.toLocaleString()}</b> ({counts.storySales})</span>
      </div>
      <p className="mt-2 text-[11px] text-on-surface-variant">
        Tính từ 0h hôm nay · số coin thực nhận (đã trừ phí nền tảng).
      </p>
    </div>
  );
}
