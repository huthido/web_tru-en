'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Thanh điều hướng 3 loại nội dung — Truyện / Mày tao / Tranh — nay là 3 TRANG
 * RIÊNG (/truyen, /nghe-thuat, /tranh) thay vì tab ?tab=. Nhãn "Mày tao" giữ
 * nguyên dù slug là /nghe-thuat. Dùng chung ở cả 3 trang.
 */
const TABS = [
  { href: '/truyen', label: '📚 Truyện' },
  { href: '/nghe-thuat', label: '🎨 Mày tao' },
  { href: '/tranh', label: '🖼️ Tranh' },
];

export function ContentTabsNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-[60px] z-30 bg-background/90 backdrop-blur-md border-b border-outline-variant/20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto flex">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? 'border-on-surface text-on-surface'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
