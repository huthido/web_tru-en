'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/components/providers/theme-provider';
import { useSearchSuggestions } from '@/lib/api/hooks/use-search';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { Coins } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, isLoading, logout, isLoggingOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { data: settings } = useSettings();
  // Số dư xu hiển thị ở badge — chỉ fetch khi đã đăng nhập.
  const { data: wallet } = useWalletBalance(isAuthenticated);
  const coinBalance = (wallet?.purchasedBalance ?? 0) + (wallet?.earnedBalance ?? 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: suggestions, isLoading: isLoadingSuggestions } = useSearchSuggestions(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    // Validate: require at least 2 characters
    if (!trimmedQuery) {
      return; // Don't navigate if empty
    }

    if (trimmedQuery.length < 2) {
      // Optionally show feedback
      return;
    }

    // Navigate to search results page with query
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (slug: string) => {
    router.push(`/truyen/${slug}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (isDropdownOpen || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, showSuggestions]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-[60px] flex items-center justify-between px-3 md:px-6 bg-primary-container/80 md:bg-surface/95 backdrop-blur-xl border-b border-outline-variant/40 transition-colors duration-300">
      {/* Mobile Logo + Brand "YÊU" — frosted glass header với Plus Jakarta wordmark
          để khớp glassmorphism của Stitch Luminous Petal trên mobile. */}
      <Link href="/" className="md:hidden mr-3 shrink-0 flex items-center gap-2">
        {settings?.siteLogo ? (
          <OptimizedImage
            src={settings.siteLogo}
            alt={settings.siteName || 'Logo'}
            width={28}
            height={28}
            objectFit="contain"
            placeholder="empty"
            className="w-7 h-7"
          />
        ) : (
          <svg width="28" height="28" viewBox="0 0 60 60" fill="none" className="text-primary w-7 h-7">
            <path d="M50 5L50 55L30 45.3594L10 55L10 5L50 5Z" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 5V45.3594" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="font-display text-xl font-extrabold tracking-tight text-on-surface">YÊU</span>
      </Link>

      {/* Search Bar */}
      <div ref={searchRef} className="flex-1 max-w-md mr-2 md:mr-4 relative">
        <form onSubmit={handleSearch}>
          <div className="relative flex items-center gap-2 md:gap-3">
            <button
              type="submit"
              className="w-[24px] h-[24px] md:w-[30px] md:h-[30px] flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors duration-300 flex-shrink-0"
              aria-label="Tìm kiếm"
            >
              <svg width="24" height="24" className="md:w-[30px] md:h-[30px]" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.375 4C20.105 4 24.75 8.64505 24.75 14.375C24.75 20.105 20.105 24.75 14.375 24.75C8.64505 24.75 4 20.105 4 14.375C4 8.64505 8.64505 4 14.375 4Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M27.5 27.5L25 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Tìm kiếm truyện..."
              className="flex-1 h-[30px] bg-transparent border-none outline-none text-on-surface placeholder-on-surface-variant/60 text-xs md:text-sm transition-colors duration-300"
            />
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && searchQuery.trim().length >= 2 && (
          <div className="absolute z-50 w-full mt-2 bg-surface-container rounded-lg shadow-lg border border-outline-variant/40 max-h-[300px] overflow-y-auto">
            {isLoadingSuggestions ? (
              <div className="p-4 text-center text-sm text-on-surface-variant">
                Đang tải...
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              <div className="p-2">
                <div className="text-xs text-on-surface-variant px-2 py-1">Gợi ý</div>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.slug)}
                    className="w-full text-left px-4 py-2 hover:bg-surface-variant rounded transition-colors flex items-center gap-3"
                  >
                    {suggestion.coverImage && (
                      <OptimizedImage
                        src={suggestion.coverImage}
                        alt={suggestion.title}
                        width={40}
                        height={56}
                        objectFit="cover"
                        sizes={ImageSizes.bookThumbnail}
                        quality={75}
                        placeholder="blur"
                        className="rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-on-surface truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.authorName && (
                        <div className="text-xs text-on-surface-variant truncate">
                          {suggestion.authorName}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-on-surface-variant">
                Không tìm thấy gợi ý
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side: Theme Toggle, User Info, Notification */}
      <div className="flex items-center gap-1.5 md:gap-4">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-full border-2 transition-all duration-300 hover:scale-105 active:scale-95 bg-surface-container border-primary/60 shadow-sm hover:shadow-md"
          aria-label="Chuyển đổi giao diện"
        >
          {theme === 'light' ? (
            <>
              <svg width="16" height="16" className="md:w-[18px] md:h-[18px] transition-transform duration-300" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3.33333V1.66667M10 18.3333V16.6667M16.6667 10H18.3333M1.66667 10H3.33333M15.7733 4.22667L16.8333 3.16667M3.16667 16.8333L4.22667 15.7733M15.7733 15.7733L16.8333 16.8333M3.16667 3.16667L4.22667 4.22667M14.1667 10C14.1667 12.3012 12.3012 14.1667 10 14.1667C7.69881 14.1667 5.83333 12.3012 5.83333 10C5.83333 7.69881 7.69881 5.83333 10 5.83333C12.3012 5.83333 14.1667 7.69881 14.1667 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-on-surface transition-colors duration-300"
                />
              </svg>
              <span className="hidden md:inline text-xs font-medium text-on-surface transition-colors duration-300">
                Sáng
              </span>
            </>
          ) : (
            <>
              <svg width="16" height="16" className="md:w-[18px] md:h-[18px] transition-transform duration-300" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3.33333C6.3181 3.33333 3.33333 6.3181 3.33333 10C3.33333 13.6819 6.3181 16.6667 10 16.6667C13.6819 16.6667 16.6667 13.6819 16.6667 10C16.6667 9.17157 16.4958 8.38014 16.1867 7.66667M10 1.66667V3.33333M10 16.6667V18.3333M18.3333 10H16.6667M3.33333 10H1.66667M15.7733 4.22667L14.7133 5.28667M5.28667 14.7133L4.22667 15.7733M15.7733 15.7733L14.7133 14.7133M5.28667 5.28667L4.22667 4.22667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-on-surface transition-colors duration-300"
                />
              </svg>
              <span className="hidden md:inline text-xs font-medium text-on-surface transition-colors duration-300">
                Tối
              </span>
            </>
          )}
        </button>

        {/* Badge số dư xu — bấm vào để tới Cửa hàng */}
        {isAuthenticated && user && (
          <Link
            href="/shop"
            aria-label="Cửa hàng — nạp xu"
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-full border-2 transition-all duration-300 hover:scale-105 active:scale-95 bg-surface-container border-primary/60 shadow-sm hover:shadow-md"
          >
            <Coins size={16} className="md:w-[18px] md:h-[18px] text-amber-500" />
            <span className="text-xs font-semibold text-on-surface">
              {coinBalance.toLocaleString('vi-VN')}
            </span>
          </Link>
        )}

        {/* Notification Bell */}
        {isAuthenticated && user && <NotificationBell />}

        {/* User Info or Login Button — ẩn avatar dropdown ở mobile (Tài khoản
            đã có slot trong bottom nav). Desktop vẫn hiện cho quick action. */}
        {!isLoading && (
          <>
            {isAuthenticated && user ? (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 md:gap-2.5 hover:opacity-80 transition-opacity duration-300"
                  aria-label="User menu"
                >
                  <div className="relative w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full overflow-hidden bg-surface-variant flex items-center justify-center border-2 border-outline-variant transition-all duration-300 hover:scale-105 cursor-pointer">
                    {user.avatar ? (
                      <OptimizedImage
                        src={user.avatar}
                        alt={user.displayName || user.username}
                        fill
                        objectFit="cover"
                        sizes={ImageSizes.avatar}
                        quality={80}
                        placeholder="blur"
                      />
                    ) : (
                      <span className="text-sm md:text-base font-semibold text-on-surface-variant">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="hidden lg:block text-sm md:text-base font-medium text-on-surface transition-colors duration-300">
                    {user.displayName || user.username}
                  </span>
                  {/* Dropdown Arrow */}
                  <svg
                    width="16"
                    height="16"
                    className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''} text-on-surface-variant hidden lg:block`}
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface-container rounded-lg shadow-lg border border-outline-variant/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-variant transition-colors duration-200"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="text-on-surface-variant"
                      >
                        <path
                          d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M0 18C0 14.134 3.13401 11 7 11H13C16.866 11 20 14.134 20 18V20H0V18Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Hồ sơ</span>
                    </Link>
                    {/* Link vào khu quản trị — chỉ hiện với tài khoản admin. */}
                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-tertiary hover:bg-surface-variant transition-colors duration-200"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Trang quản trị</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-surface-variant transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="text-red-600 dark:text-red-400"
                      >
                        <path
                          d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M13.3333 14.1667L17.5 10L13.3333 5.83333"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M17.5 10H7.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary hover:opacity-90 text-on-primary text-xs md:text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <span className="hidden sm:inline">Đăng nhập</span>
                <span className="sm:hidden">Đăng nhập</span>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}

