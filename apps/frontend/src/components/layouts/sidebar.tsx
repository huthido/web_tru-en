'use client';

import Link from 'next/link';
import { useRef, useEffect, useLayoutEffect } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Home, Compass, Library, Clock, Bookmark, Heart, Store, Upload, LayoutDashboard, Wallet, Settings, User, HelpCircle, Plus, type LucideIcon } from 'lucide-react';
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
  const navRef = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);

  // Lưu scroll ngay lúc click — trước khi Next.js navigate
  const saveScroll = () => {
    if (navRef.current) savedScroll.current = navRef.current.scrollTop;
  };

  // Restore TRƯỚC khi browser paint (useLayoutEffect) để không thấy flash
  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = savedScroll.current;
  }, [pathname]);

  const canCreateStories = !!user;

  // Chưa đăng nhập → đẩy qua login kèm redirect, để Đăng truyện / Kiếm tiền
  // luôn hiển thị và thu hút người mới + tác giả.
  const uploadHref = canCreateStories ? '/author/stories/create' : '/login?redirect=/author/stories/create';
  const earnHref = user ? '/author/earnings' : '/login?redirect=/author/earnings';

  // Thứ tự tính năng chính theo docs/Fix vài điểm trên app web.pdf:
  // 1 Trang chủ · 2 Khám phá · 3 Đăng truyện · 4 Kiếm tiền · 5 Cửa hàng ·
  // 6 Tài khoản (cài đặt + tính năng phụ nằm trong Tài khoản).
  const links: NavLink[] = [
    { href: '/', label: 'Trang chủ', icon: Home, active: pathname === '/' },
    { href: '/stories', label: 'Khám phá', icon: Compass, active: pathname === '/stories' },
    { href: uploadHref, label: 'Đăng truyện', icon: Upload, active: pathname === '/author/stories/create' },
    { href: earnHref, label: 'Kiếm tiền', icon: Wallet, active: pathname === '/author/earnings' },
    { href: '/shop', label: 'Cửa hàng', icon: Store, active: pathname === '/shop' },
    { href: '/profile', label: 'Tài khoản', icon: User, active: pathname === '/profile' },
  ];

  // Tiện ích phụ — desktop hiển thị nhóm riêng dưới primary; mobile truy cập
  // qua Tài khoản (ProfileScreen / MobileExtraMenu).
  const extraLinks: NavLink[] = [
    { href: '/library', label: 'Thư viện', icon: Library, active: pathname === '/library' },
    { href: '/history', label: 'Lịch sử', icon: Clock, active: pathname === '/history' },
    { href: '/follows', label: 'Theo dõi', icon: Bookmark, active: pathname === '/follows', fillWhenActive: true },
    { href: '/favorites', label: 'Yêu thích', icon: Heart, active: pathname === '/favorites', fillWhenActive: true },
    { href: '/author/dashboard', label: 'Kênh tác giả', icon: LayoutDashboard, active: !!pathname?.startsWith('/author/dashboard'), authOnly: true },
  ];

  // Secondary section, pinned to the bottom of the rail.
  const bottomLinks: NavLink[] = [
    { href: '/profile', label: 'Cài đặt', icon: Settings, active: false },
    { href: '/gioi-thieu', label: 'Trợ giúp', icon: HelpCircle, active: pathname === '/gioi-thieu' },
  ];

  const visibleExtra = extraLinks.filter((l) => !l.authOnly || canCreateStories);
  // Mobile bottom bar theo mock PDF: Trang chủ · Khám phá · [FAB Đăng truyện]
  // · Kiếm tiền · Cửa hàng · Tài khoản = 6 slot.
  const mobileLeft = [links[0], links[1]];
  const mobileRight = [links[3], links[4], links[5]];

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
              // Logo đen-light / trắng-dark theo theme.
              className="w-9 h-9 flex-shrink-0 dark:invert dark:brightness-200"
            />
          ) : (
            <BrandMark size={30} className="flex-shrink-0" />
          )}
          <span className="font-display text-2xl font-extrabold tracking-tight text-black dark:text-white">YÊU</span>
        </Link>

        {/* Primary navigation — `min-h-0` bắt buộc trong flex parent để overflow
            con scroll được; không có nó, flex-1 cao bằng nội dung và mục dưới
            bị crop khi list dài (10+ links với author role). */}
        <nav ref={navRef} onClick={saveScroll} className="flex-1 min-h-0 overflow-y-auto space-y-1.5 px-3" style={{ scrollBehavior: 'auto' }}>
          {links.map((l) => (
            <NavRow key={l.label} link={l} />
          ))}

          {/* Tiện ích phụ */}
          <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
            Tiện ích
          </p>
          {visibleExtra.map((l) => (
            <NavRow key={l.label} link={l} />
          ))}
        </nav>

        {/* Secondary section + người dùng đăng nhập (đáy sidebar — luôn hiển
            thị vì nằm ngoài <nav> scroll). */}
        <div className="flex-shrink-0 px-3 pt-5 mt-2 border-t border-outline-variant/30 space-y-1.5">
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

      {/* Mobile Bottom Navigation — thứ tự theo mock PDF:
          Trang chủ · Khám phá · [FAB Đăng truyện] · Kiếm tiền · Cửa hàng ·
          Tài khoản. Tính năng phụ (Thư viện, Lịch sử, Theo dõi, Yêu thích,
          Kênh tác giả, Cài đặt, Trợ giúp) nằm trong Tài khoản. */}
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
            const isAccount = l.label === 'Tài khoản';
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
                <span className={`text-[10px] font-medium ${l.active ? 'text-primary' : 'text-on-surface-variant'}`}>{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile "Khác" drawer — đã xoá. Tất cả mục phụ giờ nằm trong
          ProfileScreen via <MobileExtraMenu> component (grid 4-col). */}
    </>
  );
}
