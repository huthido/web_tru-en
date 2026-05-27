'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { useMyMonetizationEligibility } from '@/lib/api/hooks/use-monetization';

interface MonetizationLockedNoticeProps {
  feature: 'paid-chapter' | 'vip-story' | 'donation' | 'ad-revenue';
}

const FEATURE_LABEL: Record<MonetizationLockedNoticeProps['feature'], string> = {
  'paid-chapter': 'đặt giá coin cho chương',
  'vip-story': 'bán truyện VIP',
  'donation': 'nhận donate từ độc giả',
  'ad-revenue': 'nhận xu từ quảng cáo',
};

/**
 * Tự ẩn khi tác giả đã đủ điều kiện kiếm tiền. Nếu chưa, hiển thị 1 hộp
 * inline giải thích vì sao tính năng paid/VIP/donate bị disable và link
 * dẫn tới trang tiến độ /author/eligibility.
 *
 * Pattern: đặt cạnh / phía trên trường input liên quan, đồng thời disable
 * trường input bằng prop `disabled` thông qua `useMonetizationLocked()`.
 */
export function MonetizationLockedNotice({ feature }: MonetizationLockedNoticeProps) {
  const { data, isLoading } = useMyMonetizationEligibility(true);
  if (isLoading || !data || data.eligible) return null;

  return (
    <div className="mt-2 rounded-lg border border-outline-variant bg-surface-variant/40 p-3 flex items-start gap-2 text-sm">
      <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-on-surface-variant" />
      <div className="min-w-0 flex-1">
        <p className="text-on-surface">
          Bạn cần mở khoá Trung tâm Kiếm tiền để {FEATURE_LABEL[feature]}.
        </p>
        <Link
          href="/author/eligibility"
          className="inline-flex items-center gap-1 mt-1 text-primary font-medium hover:underline"
        >
          Xem điều kiện
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** Hook tiện lợi để disable input khi chưa đủ điều kiện. */
export function useMonetizationLocked(): boolean {
  const { data } = useMyMonetizationEligibility(true);
  if (!data) return false;
  return !data.eligible;
}
