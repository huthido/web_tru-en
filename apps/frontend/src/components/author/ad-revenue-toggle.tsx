'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Loader2 } from 'lucide-react';
import { storiesService } from '@/lib/api/stories.service';
import {
  MonetizationLockedNotice,
  useMonetizationLocked,
} from '@/components/author/monetization-locked-notice';
import { useToastContext } from '@/components/providers/toast-provider';

interface AdRevenueToggleProps {
  storyId: string;
  initialEnabled: boolean;
}

/**
 * Toggle "Nhận xu từ quảng cáo" trên trang sửa truyện. Gọi
 * `PATCH /stories/:id/ad-revenue` — backend tự assert eligibility
 * (chỉ tác giả đủ 4 điều kiện mới bật được; tắt thì không gate).
 *
 * Phase B2.1 — opt-in & tracking. Logic credit xu chạy ở cron riêng
 * (B2.2 — đang TODO).
 */
export function AdRevenueToggle({ storyId, initialEnabled }: AdRevenueToggleProps) {
  const { showToast } = useToastContext();
  const monetizationLocked = useMonetizationLocked();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  const onToggle = async () => {
    if (saving) return;
    const next = !enabled;
    setSaving(true);
    setEnabled(next);
    try {
      const r = await storiesService.setAdRevenue(storyId, next);
      setEnabled(r.adRevenueEnabled);
      showToast(
        next ? 'Đã bật nhận xu quảng cáo' : 'Đã tắt nhận xu quảng cáo',
        'success',
      );
    } catch (err: any) {
      setEnabled(!next);
      const code = err?.response?.data?.code;
      if (code === 'ELIGIBILITY_REQUIRED') {
        showToast('Cần mở khoá tính năng nâng cao trước', 'error');
      } else {
        showToast('Không lưu được thay đổi, thử lại sau', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Khi chưa eligible: chỉ disable bật-on. Off vẫn cho phép (= không thay đổi).
  const lockedOn = !enabled && monetizationLocked;

  return (
    <div>
      <label className="block text-sm font-medium text-on-surface-variant mb-2">
        Nhận xu từ quảng cáo
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving || lockedOn}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            enabled ? 'bg-primary' : 'bg-surface-variant'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <Megaphone className="w-4 h-4 text-on-surface-variant" />
          <span className="text-on-surface">
            {enabled ? 'Đang bật — truyện này được chia doanh thu ads' : 'Đang tắt'}
          </span>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}
        </div>
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">
        Khi bật, hệ thống ghi nhận impression / click ads trên truyện này và
        chia xu vào ví đã kiếm. Cron tính xu chạy hằng ngày.
      </p>
      <MonetizationLockedNotice feature="ad-revenue" />
    </div>
  );
}
