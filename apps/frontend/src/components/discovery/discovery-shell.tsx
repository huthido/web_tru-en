import type { ReactNode } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';

/**
 * Khung trang công khai (sidebar + header + vùng nội dung) cho các trang khám
 * phá render trên server — cùng bố cục với /truyen để chuyển trang không giật.
 */
export function DiscoveryShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
          <div className="max-w-5xl mx-auto px-4 md:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Đường dẫn phân cấp hiển thị (khớp JSON-LD BreadcrumbList của trang). */
export function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs text-on-surface-variant">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-primary truncate">
                {item.name}
              </Link>
            ) : (
              <span className="text-on-surface truncate">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** 1234 → "1,2K"; 1_500_000 → "1,5M" (định dạng Việt Nam). */
export function formatCompact(n: number): string {
  const value = Number(n) || 0;
  const fmt = (x: number) => x.toFixed(1).replace(/\.0$/, '').replace('.', ',');
  if (value >= 1000000) return `${fmt(value / 1000000)}M`;
  if (value >= 10000) return `${fmt(value / 1000)}K`;
  return value.toLocaleString('vi-VN');
}
