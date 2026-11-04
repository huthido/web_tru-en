'use client';

import { Share2 } from 'lucide-react';
import { useToastContext } from '@/components/providers/toast-provider';

interface Props {
  /** Đường dẫn tương đối (vd `/tranh?tranh=abc`) — ghép với origin lúc bấm. */
  path: string;
  title: string;
  className?: string;
  label?: string;
}

/** Copy có fallback execCommand cho trình duyệt cũ (iOS 12 chưa có navigator.clipboard). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* rơi xuống fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Nút chia sẻ: share sheet native nếu có, không thì copy link. */
export function ShareButton({ path, title, className, label }: Props) {
  const { showToast } = useToastContext();

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${path}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    const ok = await copyText(url);
    showToast(ok ? 'Đã sao chép liên kết' : 'Không sao chép được liên kết', ok ? 'success' : 'error');
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Chia sẻ"
      className={
        className ??
        'flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
      }
    >
      <Share2 className="w-5 h-5" />
      {label && <span>{label}</span>}
    </button>
  );
}
