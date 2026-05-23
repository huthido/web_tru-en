'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Home, Compass, Library, Clock, Bookmark, Heart, Store, Upload, LayoutDashboard, Wallet, Settings, BookOpen, HelpCircle, MoreHorizontal, X, type LucideIcon } from 'lucide-react';

/** Nhãn vai trò hiển thị dưới tên người dùng. */
function roleLabel(role?: string): string {
  if (role === 'ADMIN') return 'Quản trị viên';
  if (role === 'AUTHOR') return 'Tác giả';
  return 'Thành viên';
}

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

/** A single sidebar row — icon + label, MD3 "Vivid Reader" style. */
function NavRow({ link }: { link: NavLink }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-label={link.label}
      className={`flex items-center gap-4 p-3 transition-all duration-200 active:scale-[0.98] ${
        link.active
          ? 'text-primary font-bold bg-primary/10 border-r-4 border-primary rounded-l-lg'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg'
      }`}
    >
      <Icon
        size={22}
        className="flex-shrink-0"
        fill={link.active && link.fillWhenActive ? 'currentColor' : 'none'}
      />
      <span className="text-sm">{link.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const [moreOpen, setMoreOpen] = useState(false);

  const canCreateStories = !!user;

  // Đóng drawer khi điều hướng sang trang khác.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Khóa scroll body + đóng bằng phím ESC khi drawer mở.
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Danh mục bám theo mockup theme Stitch (Home · Discover · Library ·
  // History · Bookmarks · Shop · Upload · Monetization).
  const links: NavLink[] = [
    { href: '/', label: 'Trang chủ', icon: Home, active: pathname === '/' },
    { href: '/stories', label: 'Khám phá', icon: Compass, active: pathname === '/stories' },
    { href: '/library', label: 'Thư viện', icon: Library, active: pathname === '/library' },
    { href: '/history', label: 'Lịch sử', icon: Clock, active: pathname === '/history' },
    { href: '/follows', label: 'Theo dõi', icon: Bookmark, active: pathname === '/follows', fillWhenActive: true },
    { href: '/favorites', label: 'Yêu thích', icon: Heart, active: pathname === '/favorites', fillWhenActive: true },
    { href: '/shop', label: 'Cửa hàng', icon: Store, active: pathname === '/shop' },
    { href: '/author/stories/create', label: 'Đăng truyện', icon: Upload, active: pathname === '/author/stories/create', authOnly: true },
    { href: '/author/dashboard', label: 'Kênh tác giả', icon: LayoutDashboard, active: !!pathname?.startsWith('/author/dashboard'), authOnly: true },
    { href: '/author/earnings', label: 'Kiếm tiền', icon: Wallet, active: pathname === '/author/earnings', authOnly: true },
  ];

  // Secondary section, pinned to the bottom of the rail.
  const bottomLinks: NavLink[] = [
    { href: '/profile', label: 'Cài đặt', icon: Settings, active: pathname === '/profile' },
    { href: '/gioi-thieu', label: 'Trợ giúp', icon: HelpCircle, active: pathname === '/gioi-thieu' },
  ];

  const visible = links.filter((l) => !l.authOnly || canCreateStories);
  // Mobile bottom bar: 4 mục chính + nút "Khác" mở drawer cho phần còn lại.
  const mobilePrimaryHrefs = ['/', '/stories', '/library', '/history'];
  const mobilePrimary = links.filter((l) => mobilePrimaryHrefs.includes(l.href));
  const moreLinks = [...links, ...bottomLinks].filter(
    (l) => !mobilePrimaryHrefs.includes(l.href) && (!l.authOnly || canCreateStories)
  );
  const moreActive = moreLinks.some((l) => l.active);

  return (
    <>
      {/* Desktop Sidebar — Vivid Reader expanded rail */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col py-8 bg-surface-container border-r border-outline-variant/40 transition-colors duration-300 z-40">
        {/* Logo / wordmark */}
        <Link
          href="/"
          aria-label="YÊU — Trang chủ"
          className="px-6 mb-10 flex items-center gap-3 transition-transform duration-300 hover:scale-[1.03] active:scale-95"
        >
          {settings?.siteLogo ? (
            <OptimizedImage
              src={settings.siteLogo}
              alt={settings.siteName || 'YÊU'}
              width={36}
              height={36}
              objectFit="contain"
              placeholder="empty"
              priority
              className="w-9 h-9 flex-shrink-0"
            />
          ) : (
            <BookOpen size={30} className="text-primary flex-shrink-0" />
          )}
          <span className="font-display text-2xl font-extrabold tracking-tight text-primary">YÊU</span>
        </Link>

        {/* Primary navigation */}
        <nav className="flex-1 space-y-1.5 px-3">
          {visible.map((l) => (
            <NavRow key={l.href} link={l} />
          ))}
        </nav>

        {/* Secondary section + người dùng đăng nhập (đáy sidebar — theo theme) */}
        <div className="px-3 pt-5 mt-2 border-t border-outline-variant/30 space-y-1.5">
          {bottomLinks.map((l) => (
            <NavRow key={l.href} link={l} />
          ))}

          {user && (
            <Link
              href="/profile"
              aria-label="Trang cá nhân"
              className="mt-2 flex items-center gap-3 p-2 rounded-lg hover:bg-surface-variant transition-colors"
            >
              <span className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName || user.username || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-on-primary-container">
                    {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-on-surface truncate">
                  {user.displayName || user.username}
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {roleLabel(user.role)}
                </span>
              </span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant/40 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2 py-2">
          {mobilePrimary.map((l) => {
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

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Mở menu khác"
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${
              moreActive ? 'bg-primary/15' : 'bg-transparent hover:bg-surface-variant'
            }`}
          >
            <MoreHorizontal
              size={22}
              className={moreActive ? 'text-primary' : 'text-on-surface-variant'}
            />
            <span className={`text-[10px] font-medium ${moreActive ? 'text-primary' : 'text-on-surface-variant'}`}>
              Khác
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "Khác" drawer — bottom sheet hiển thị các mục còn lại */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Menu khác"
        >
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-surface-container rounded-t-2xl shadow-2xl border-t border-outline-variant/40 safe-area-inset-bottom animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-on-surface">Menu</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Đóng menu"
                className="p-2 rounded-full hover:bg-surface-variant transition-colors"
              >
                <X size={20} className="text-on-surface-variant" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 px-3 pb-6 pt-1">
              {moreLinks.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-label={l.label}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                      l.active ? 'bg-primary/15' : 'bg-transparent hover:bg-surface-variant'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={l.active ? 'text-primary' : 'text-on-surface-variant'}
                      fill={l.active && l.fillWhenActive ? 'currentColor' : 'none'}
                    />
                    <span className={`text-[11px] font-medium text-center leading-tight ${l.active ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {l.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
