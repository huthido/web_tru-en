'use client';

import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  /** Trả về null nếu false — tiện gọi `<VerifiedBadge show={profile.isVerified} />`. */
  show?: boolean;
  size?: number;
  className?: string;
}

/**
 * Tick xanh ✓ cho tác giả đã đủ điều kiện mở khoá tính năng nâng cao.
 * Live-compute từ backend `MonetizationService.isEligible(userId)` — không
 * có cron/denormalize.
 */
export function VerifiedBadge({ show = true, size = 16, className = '' }: VerifiedBadgeProps) {
  if (!show) return null;
  return (
    <BadgeCheck
      className={`inline-block text-primary fill-primary/20 ${className}`}
      size={size}
      strokeWidth={2.2}
      aria-label="Tác giả đã mở khoá tính năng nâng cao"
    />
  );
}
