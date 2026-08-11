'use client';

import { useEffect } from 'react';

/**
 * Fallback ảnh WebP cho Safari iOS < 14.
 *
 * Toàn bộ ảnh upload lưu dạng .webp trên CDN tĩnh (không content negotiation),
 * còn HTML thì cache chung cho mọi trình duyệt — nên phải xử lý phía client:
 * probe khả năng decode WebP, nếu KHÔNG hỗ trợ thì viết lại `src` của mọi
 * <img> .webp sang endpoint transcode `/images/compat` của backend (trả JPEG).
 *
 * Trình duyệt hiện đại: probe pass → return sớm, không quét không observe gì.
 * Ảnh trong nội dung chương là <img> thô trong HTML sanitize nên phải quét DOM
 * chứ không móc được vào next/image; MutationObserver lo phần render sau
 * (chuyển trang client-side, lazy load, React re-render đè lại src).
 */

// 1x1 WebP lossy — decode được thì width = 1.
const WEBP_PROBE =
  'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

const WEBP_RE = /\.webp($|\?)/i;

/** Bóc URL gốc: ảnh qua next/image nằm trong query `url` của /_next/image. */
function resolveOriginal(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.pathname === '/_next/image') {
      return u.searchParams.get('url');
    }
    return raw;
  } catch {
    return null;
  }
}

function startRewriting() {
  const api = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!api) return;

  const rewrite = (img: HTMLImageElement) => {
    if (img.dataset.webpCompat) return;
    const original = resolveOriginal(img.getAttribute('src') || '');
    if (!original || !WEBP_RE.test(original)) return;
    // Đánh dấu TRƯỚC khi đổi src để mutation do chính mình gây ra bị bỏ qua.
    img.dataset.webpCompat = '1';
    // srcset/sizes (next/image) sẽ thắng src nếu không gỡ.
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = `${api}/images/compat?src=${encodeURIComponent(original)}`;
  };

  const scan = (root: ParentNode) => {
    if (root instanceof HTMLImageElement) {
      rewrite(root);
      return;
    }
    root.querySelectorAll?.('img').forEach(rewrite);
  };

  scan(document);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof HTMLImageElement) {
        // React re-render có thể đè lại src/srcset — flag cũng bị element mới
        // thay thế nên rewrite() tự phân biệt được.
        if (!m.target.dataset.webpCompat) rewrite(m.target);
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  });
}

export function WebpFallback() {
  useEffect(() => {
    const probe = new Image();
    probe.onload = () => {
      if (probe.width < 1) startRewriting();
    };
    probe.onerror = () => startRewriting();
    probe.src = WEBP_PROBE;
  }, []);

  return null;
}
