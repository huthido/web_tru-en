'use client';

import Link from 'next/link';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import { useMyMonetizationEligibility } from '@/lib/api/hooks/use-monetization';

/**
 * Banner trên /author/dashboard mời tác giả mở khoá tính năng nâng cao
 * (ads revenue, paid chapter, VIP story, verified ✓). Tự ẩn khi đã đủ.
 * Donate / bán content đã tạo trước đó vẫn mở tự do — không gate.
 */
export function MonetizationProgressBanner() {
  const { data, isLoading } = useMyMonetizationEligibility(true);

  if (isLoading || !data) return null;
  if (data.eligible) return null;

  const views = data.progress.totalViews;
  const followers = data.progress.followers;
  const remainingViews = Math.max(0, views.required - views.current);
  const remainingFollowers = Math.max(0, followers.required - followers.current);
  const accountOk = data.criteria.accountOk;
  const contentOk = data.criteria.contentOk;

  const hints: string[] = [];
  if (remainingViews > 0) hints.push(`thêm ${remainingViews.toLocaleString('vi-VN')} lượt xem`);
  if (remainingFollowers > 0) hints.push(`thêm ${remainingFollowers} followers`);
  if (!accountOk) hints.push('xử lý báo cáo vi phạm tài khoản');
  if (!contentOk) hints.push('xử lý báo cáo vi phạm nội dung');

  return (
    <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-on-surface flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Mở khoá tính năng nâng cao
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Cần {hints.length > 0 ? hints.join(', ') : 'đủ 4 điều kiện'} để nhận xu từ quảng cáo, bán chương trả phí, truyện VIP và gắn tick xanh ✓.
          </p>
        </div>
      </div>
      <Link
        href="/author/eligibility"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors flex-shrink-0"
      >
        Xem tiến độ
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
