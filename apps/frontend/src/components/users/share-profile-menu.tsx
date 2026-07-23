'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Share2,
  Copy,
  Check,
  Facebook,
  Twitter,
  Send,
  MessageCircle,
  QrCode,
  X as CloseIcon,
  Link2,
} from 'lucide-react';

interface ShareProfileMenuProps {
  /** URL tuyệt đối của trang cá nhân (để trống sẽ dùng window.location). */
  url?: string;
  /** Tiêu đề kèm khi chia sẻ (tên tác giả). */
  title?: string;
  /** Nhãn nút mở. */
  label?: string;
  className?: string;
  /** Ẩn chữ, chỉ hiện icon (dùng khi để cạnh nút khác). */
  iconOnly?: boolean;
}

/**
 * Nút "Chia sẻ" cho trang cá nhân /u/[username]. Mở modal với: link + copy,
 * các nút chia sẻ mạng xã hội (Facebook, X, Telegram, Zalo), chia sẻ hệ thống
 * (navigator.share trên mobile) và mã QR sinh cục bộ bằng thư viện `qrcode`.
 *
 * Tái sử dụng được: truyền `url`/`title`, hoặc để trống sẽ tự lấy URL hiện tại.
 */
export function ShareProfileMenu({
  url,
  title,
  label = 'Chia sẻ',
  className = '',
  iconOnly = false,
}: ShareProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url || '');
  const [qr, setQr] = useState<string>('');
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Xác định URL + khả năng chia sẻ hệ thống ở phía client.
  useEffect(() => {
    if (!open) return;
    const resolved =
      url || (typeof window !== 'undefined' ? window.location.href : '');
    setShareUrl(resolved);
    setCanNativeShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    );
  }, [open, url]);

  // Sinh mã QR khi mở modal (data-URL cục bộ, không gọi dịch vụ ngoài).
  useEffect(() => {
    if (!open || !shareUrl) return;
    let alive = true;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (alive) setQr(dataUrl);
      })
      .catch(() => {
        if (alive) setQr('');
      });
    return () => {
      alive = false;
    };
  }, [open, shareUrl]);

  const shareTitle = title ? `Trang cá nhân của ${title}` : 'Trang cá nhân';
  const enc = encodeURIComponent(shareUrl);
  const encText = encodeURIComponent(shareTitle);

  const socials = [
    {
      key: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      color: 'text-[#1877F2]',
    },
    {
      key: 'x',
      label: 'X',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${enc}&text=${encText}`,
      color: 'text-on-surface',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${enc}&text=${encText}`,
      color: 'text-[#229ED9]',
    },
    {
      key: 'zalo',
      label: 'Zalo',
      icon: MessageCircle,
      href: `https://sp.zalo.me/plugins/share?href=${enc}`,
      color: 'text-[#0068FF]',
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: chọn text thủ công nếu clipboard API bị chặn.
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* bỏ qua */
      }
      document.body.removeChild(el);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: shareTitle, url: shareUrl });
    } catch {
      /* user huỷ hoặc không hỗ trợ — bỏ qua */
    }
  };

  const openSocial = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors bg-surface-variant hover:bg-surface-container-high text-on-surface ${className}`}
      >
        <Share2 className="w-4 h-4" />
        {!iconOnly && label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface-container rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-on-surface inline-flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Chia sẻ trang cá nhân
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center mb-5">
              <div className="p-3 bg-white rounded-xl border border-outline-variant">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="Mã QR trang cá nhân" width={180} height={180} className="w-44 h-44" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-gray-400">
                    <QrCode className="w-10 h-10" />
                  </div>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-2">Quét mã để mở trang cá nhân</p>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => openSocial(s.href)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    <Icon className={`w-6 h-6 ${s.color}`} />
                    <span className="text-[11px] font-medium text-on-surface-variant">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Native share (mobile) */}
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Chia sẻ qua ứng dụng khác…
              </button>
            )}

            {/* Copy link */}
            <div className="flex items-center gap-2 p-2 rounded-lg border border-outline-variant bg-surface-container-low">
              <Link2 className="w-4 h-4 text-on-surface-variant flex-shrink-0 ml-1" />
              <span className="flex-1 min-w-0 truncate text-sm text-on-surface-variant">
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-on-primary hover:bg-primary/90'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
