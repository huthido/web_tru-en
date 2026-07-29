'use client';

import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { useToastContext } from '@/components/providers/toast-provider';
import {
  REPORT_REASONS,
  ReportReason,
  ReportTargetType,
  reportsService,
} from '@/lib/api/reports.service';

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  /** Tên nội dung bị báo cáo, hiện trong tiêu đề để người dùng khỏi nhầm. */
  targetLabel?: string;
  onClose: () => void;
}

/**
 * Modal báo cáo nội dung vi phạm — dùng chung cho mọi loại UGC
 * (Apple §1.2). Hiện đang gắn ở gian hàng Tranh.
 */
export function ReportModal({ targetType, targetId, targetLabel, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToastContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await reportsService.create({
        targetType,
        targetId,
        reason,
        note: note.trim() || undefined,
      });
    } catch (err: any) {
      const raw = err?.response?.data?.error ?? err?.response?.data?.message;
      showToast(
        typeof raw === 'string' ? raw : 'Không gửi được báo cáo. Thử lại nhé.',
        'error',
      );
      setBusy(false);
      return;
    }
    showToast('Đã gửi báo cáo. Quản trị viên sẽ xem xét.', 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 flex-shrink-0">
          <h2 className="font-semibold text-on-surface flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            Báo cáo vi phạm
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-variant">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {targetLabel && (
            <p className="text-sm text-on-surface-variant">
              Nội dung: <span className="font-medium text-on-surface">{targetLabel}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-on-surface-variant">Lý do</label>
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container cursor-pointer hover:bg-surface-variant transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-primary"
                />
                <span className="text-sm text-on-surface">{r.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Mô tả thêm (tuỳ chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Nói rõ hơn giúp quản trị viên xử lý nhanh hơn..."
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                Đang gửi...
              </>
            ) : (
              'Gửi báo cáo'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
