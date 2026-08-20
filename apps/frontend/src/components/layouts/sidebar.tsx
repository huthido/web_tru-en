'use client';

import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { usePathname } from 'next/navigation';
import { useEffect as useClientEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Home, BookOpen, Camera, Palette, Library, Store, Upload, LayoutDashboard, Wallet, Settings, UserCircle, HelpCircle, Plus, Bug, Megaphone, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { BrandMark } from '@/components/ui/brand-mark';

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

/** Pill-style nav button — icon + label, bo tròn đầy đủ. */
function NavPill({ link }: { link: NavLink }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-label={link.label}
      title={link.label}
      onMouseDown={(e) => e.preventDefault()}
      className={`sidebar-center flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-200 active:scale-[0.98] font-semibold text-sm w-full ${
        link.active
          ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      <Icon
        size={18}
        className="flex-shrink-0"
        fill={link.active && link.fillWhenActive ? 'currentColor' : 'none'}
      />
      <span className="sidebar-label">{link.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: settings } = useSettings();

  const navRef = useRef<HTMLElement>(null);

  // Khôi phục vị trí scroll trước khi paint (tránh nhảy)
  useClientEffect(() => {
    const saved = sessionStorage.getItem('sidebar-scroll');
    if (saved && navRef.current) navRef.current.scrollTop = Number(saved);
  }, []);

  const saveScroll = useCallback(() => {
    if (navRef.current) sessionStorage.setItem('sidebar-scroll', String(navRef.current.scrollTop));
  }, []);

  // Thu gọn/mở rộng: trạng thái sống ở html[data-sidebar] để CSS toàn cục
  // (globals.css) điều khiển cả rail lẫn offset `md:ml-60` của mọi trang —
  // không cần React state nên SSR/hydration không lệch.
  const toggleCollapsed = useCallback(() => {
    const root = document.documentElement;
    const next = root.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    if (next === 'collapsed') root.dataset.sidebar = 'collapsed';
    else delete root.dataset.sidebar;
    try {
      localStorage.setItem('sidebar', next);
    } catch {}
  }, []);

  const canCreateStories = !!user;

  const uploadHref = canCreateStories ? '/tac-gia/truyen/tao' : '/dang-nhap?redirect=/tac-gia/truyen/tao';
  const earnHref = user ? '/tac-gia/thu-nhap' : '/dang-nhap?redirect=/tac-gia/thu-nhap';
  // Trang cá nhân (public) của người đang đăng nhập; khách → login.
  const myProfileHref = user ? `/u/${user.profileSlug || user.username}` : '/dang-nhap?redirect=/';
  const myProfileActive = !!user && pathname === `/u/${user.profileSlug || user.username}`;

  // Thứ tự menu: Trang chủ · Truyện · Mày tao · Tranh · Đăng truyện · Kiếm tiền
  // · Cửa hàng · Kênh tác giả · Thư viện · Quảng cáo · Tài khoản
  const links: NavLink[] = [
    { href: '/', label: 'Trang chủ', icon: Home, active: pathname === '/' },
    { href: '/truyen', label: 'Truyện', icon: BookOpen, active: pathname === '/truyen' },
    { href: '/nghe-thuat', label: 'Mày tao', icon: Camera, active: pathname === '/nghe-thuat' },
    { href: '/tranh', label: 'Tranh', icon: Palette, active: pathname === '/tranh' },
    { href: uploadHref, label: 'Đăng truyện', icon: Upload, active: pathname === '/tac-gia/truyen/tao' },
    { href: earnHref, label: 'Kiếm tiền', icon: Wallet, active: pathname === '/tac-gia/thu-nhap' },
    { href: '/cua-hang', label: 'Cửa hàng', icon: Store, active: pathname === '/cua-hang' },
    { href: '/tac-gia/bang-dieu-khien', label: 'Kênh tác giả', icon: LayoutDashboard, active: !!pathname?.startsWith('/tac-gia/bang-dieu-khien'), authOnly: true },
    { href: '/thu-vien', label: 'Thư viện', icon: Library, active: pathname === '/thu-vien' },
    { href: '/quang-cao', label: 'Quảng cáo', icon: Megaphone, active: pathname === '/quang-cao' },
    { href: myProfileHref, label: 'Trang cá nhân', icon: UserCircle, active: myProfileActive },
  ];

  // Secondary section, pinned to the bottom of the rail.
  const bottomLinks: NavLink[] = [
    { href: '/tai-khoan', label: 'Cài đặt', icon: Settings, active: false },
    { href: '/gioi-thieu', label: 'Trợ giúp', icon: HelpCircle, active: pathname === '/gioi-thieu' },
    { href: '/bao-loi', label: 'Báo lỗi', icon: Bug, active: pathname === '/bao-loi' },
  ];

  const visibleLinks = links.filter((l) => !l.authOnly || canCreateStories);

  // Mobile bottom nav: Trang chủ · Truyện · [FAB Mày tao] · Thư viện · Tài khoản
  // Tìm theo label để không lệch index khi thêm/bớt mục trong `links`.
  const byLabel = (label: string) => links.find((l) => l.label === label)!;
  const mobileLeft = [byLabel('Trang chủ'), byLabel('Truyện')];
  const mobileRight = [byLabel('Thư viện'), byLabel('Trang cá nhân')];

  return (
    <>
      {/* Desktop Sidebar — Vivid Reader expanded rail */}
      <aside className="sidebar-rail hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col py-8 bg-surface-container border-r border-outline-variant/40 transition-colors duration-300 z-40">
        {/* Logo / wordmark */}
        <Link
          href="/"
          aria-label="YÊU — Trang chủ"
          className="sidebar-center px-6 mb-10 flex items-center gap-3 transition-transform duration-300 hover:scale-[1.03] active:scale-95"
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
              className="w-9 h-9 flex-shrink-0 dark:invert dark:brightness-200"
            />
          ) : (
            <BrandMark size={30} className="flex-shrink-0" />
          )}
          <span className="sidebar-label font-display text-2xl font-extrabold tracking-tight text-black dark:text-white">YÊU</span>
        </Link>

        {/* Primary navigation */}
        <nav ref={navRef} onScroll={saveScroll} className="flex-1 min-h-0 overflow-y-auto space-y-1.5 px-3">
          {visibleLinks.map((l) => (
            <NavPill key={l.label} link={l} />
          ))}
        </nav>

        {/* Secondary section + user card */}
        <div className="flex-shrink-0 px-3 pt-3 mt-2 border-t border-outline-variant/30 space-y-1.5">
          {/* Nút thu gọn/mở rộng sidebar (hữu ích trên iPad/tablet) */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Thu gọn hoặc mở rộng menu"
            className="sidebar-center flex items-center gap-3 w-full px-5 py-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors duration-200 active:scale-[0.98] font-semibold text-sm"
          >
            <PanelLeftClose size={18} className="sidebar-when-expanded flex-shrink-0" />
            <PanelLeftOpen size={18} className="sidebar-when-collapsed flex-shrink-0" />
            <span className="sidebar-label">Thu gọn</span>
          </button>

          <div className="sidebar-bottom-row flex items-stretch gap-1">
            {bottomLinks.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  aria-label={l.label}
                  title={l.label}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors duration-200 active:scale-95 ${
                    l.active
                      ? 'text-primary bg-primary/10 font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="sidebar-label text-[10px] font-medium leading-none">{l.label}</span>
                </Link>
              );
            })}
          </div>

          {user && (
            <Link
              href={myProfileHref}
              aria-label="Trang cá nhân"
              title="Trang cá nhân"
              className="sidebar-center mt-2 flex items-center gap-3 p-2 rounded-lg hover:bg-surface-variant transition-colors"
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
              <span className="sidebar-label min-w-0 flex-1">
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

      {/* Mobile Bottom Navigation: Trang chủ · Truyện · [FAB Mày tao] · Thư viện · Tài khoản */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container/80 backdrop-blur-xl border-t border-outline-variant/40 z-50 safe-area-inset-bottom">
        <div className="flex items-stretch justify-around h-16 px-1 py-1 relative">
          {mobileLeft.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.label} href={l.href} aria-label={l.label}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-300 ${l.active ? 'bg-primary/15' : 'hover:bg-surface-variant'}`}>
                <Icon size={20} className={l.active ? 'text-primary' : 'text-on-surface-variant'} />
                <span className={`text-[10px] font-medium ${l.active ? 'text-primary' : 'text-on-surface-variant'}`}>{l.label}</span>
              </Link>
            );
          })}

          {/* FAB Đăng truyện — nổi giữa */}
          <div className="flex-1 flex items-center justify-center">
            <Link
              href={uploadHref}
              aria-label="Đăng truyện"
              className="flex items-center justify-center -mt-6 bg-primary text-on-primary rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-transform"
              style={{ width: 52, height: 52 }}
            >
              <Plus size={26} strokeWidth={2.5} />
            </Link>
          </div>

          {mobileRight.map((l) => {
            const Icon = l.icon;
            const isAccount = l.label === 'Trang cá nhân';
            return (
              <Link key={l.label} href={l.href} aria-label={l.label}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all duration-300 ${l.active ? 'bg-primary/15' : 'hover:bg-surface-variant'}`}>
                {isAccount && user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={l.label}
                    className={`w-5 h-5 rounded-full object-cover ${l.active ? 'ring-2 ring-primary' : ''}`}
                  />
                ) : (
                  <Icon size={20} className={l.active ? 'text-primary' : 'text-on-surface-variant'} />
                )}
                <span className={`text-[10px] font-medium ${l.active ? 'text-primary' : 'text-on-surface-variant'}`}>{isAccount ? 'Cá nhân' : l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
