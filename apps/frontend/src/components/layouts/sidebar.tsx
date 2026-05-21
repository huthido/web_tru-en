'use client';

import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Home, Clock, Bookmark, Heart, LayoutDashboard, Settings, BookOpen, type LucideIcon } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** Filled-icon variant when active (Bookmark/Heart/BookOpen). */
  fillWhenActive?: boolean;
  /** Only show for authenticated users. */
  authOnly?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: settings } = useSettings();

  const canCreateStories = !!user;

  const links: NavLink[] = [
    { href: '/', label: 'Trang chủ', icon: Home, active: pathname === '/' },
    { href: '/stories', label: 'Truyện', icon: BookOpen, active: pathname === '/stories', fillWhenActive: true },
    { href: '/history', label: 'Lịch sử', icon: Clock, active: pathname === '/history' },
    { href: '/follows', label: 'Theo dõi', icon: Bookmark, active: pathname === '/follows', fillWhenActive: true },
    { href: '/favorites', label: 'Yêu thích', icon: Heart, active: pathname === '/favorites', fillWhenActive: true },
    { href: '/author/dashboard', label: 'Tác giả', icon: LayoutDashboard, active: !!pathname?.startsWith('/author/dashboard'), authOnly: true },
    { href: '/profile', label: 'Cài đặt', icon: Settings, active: pathname === '/profile' },
  ];

  const visible = links.filter((l) => !l.authOnly || canCreateStories);
  // Mobile bottom bar shows a compact subset.
  const mobileHrefs = ['/', '/stories', '/history', '/author/dashboard', '/profile'];
  const mobileLinks = visible.filter((l) => mobileHrefs.includes(l.href));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[120px] flex-col items-center bg-surface-container border-r border-outline-variant/40 transition-colors duration-300 z-40">
        <div className="flex flex-col items-center h-full py-8">
          {/* Logo / wordmark */}
          <Link
            href="/"
            aria-label="YÊU — Trang chủ"
            className="relative w-[60px] h-[60px] flex-shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95 mb-12"
          >
            {settings?.siteLogo ? (
              <OptimizedImage
                src={settings.siteLogo}
                alt={settings.siteName || 'YÊU'}
                fill
                objectFit="contain"
                sizes={ImageSizes.logo}
                quality={90}
                placeholder="blur"
                priority
              />
            ) : (
              <span className="font-display text-3xl font-extrabold tracking-tight text-primary">YÊU</span>
            )}
          </Link>

          {/* Navigation */}
          <nav className="flex flex-col items-center gap-8 flex-1 justify-center">
            {visible.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-label={l.label}
                  className={`w-[50px] h-[50px] flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
                    l.active ? 'bg-primary/15' : 'bg-transparent hover:bg-surface-variant'
                  }`}
                >
                  <Icon
                    size={28}
                    className={l.active ? 'text-primary' : 'text-on-surface-variant'}
                    fill={l.active && l.fillWhenActive ? 'currentColor' : 'none'}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant/40 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2 py-2">
          {mobileLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${
                  l.active ? 'bg-primary/15' : 'bg-transparent hover:bg-surface-variant'
                }`}
              >
                <Icon
                  size={22}
                  className={l.active ? 'text-primary' : 'text-on-surface-variant'}
                  fill={l.active && l.fillWhenActive ? 'currentColor' : 'none'}
                />
                <span className={`text-[10px] font-medium ${l.active ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {l.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
