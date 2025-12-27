'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Home, Clock, Bookmark, Heart, LayoutDashboard, Settings } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const isHome = pathname === '/';
  const isProfile = pathname === '/profile';
  const isHistory = pathname === '/history';
  const isFavorites = pathname === '/favorites';
  const isFollows = pathname === '/follows';
  const isAuthorDashboard = pathname?.startsWith('/author/dashboard');
  const isChapterManagement = pathname?.includes('/author/stories/') && pathname?.includes('/chapters');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if user is author or admin
  const isAuthorOrAdmin = user && (user.role === 'AUTHOR' || user.role === 'ADMIN');
  const isAdmin = user && user.role === 'ADMIN';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[120px] flex-col items-center bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-300 z-40">
        <div className="flex flex-col items-center h-full py-8">
          {/* Logo - At top */}
          <Link
            href="/"
            className="w-[60px] h-[60px] flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95 mb-12"
          >
            {settings?.siteLogo ? (
              <div className="relative w-full h-full">
                <Image
                  src={settings.siteLogo}
                  alt={settings.siteName || 'Logo'}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M50 5L50 55L30 45.3594L10 55L10 5L50 5Z"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-900 dark:text-white transition-colors duration-300"
                />
                <path
                  d="M30 5V45.3594"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-900 dark:text-white transition-colors duration-300"
                />
              </svg>
            )}
          </Link>

          {/* Navigation Items - Centered vertically in remaining space */}
          <nav className="flex flex-col items-center gap-12 flex-1 justify-center">
            {/* Home */}
            <Link
              href="/"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isHome
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              aria-label="Trang chủ"
            >
              <Home
                size={30}
                className={isHome ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              />
            </Link>

            {/* History */}
            <Link
              href="/history"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isHistory
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              aria-label="Lịch sử"
            >
              <Clock
                size={30}
                className={isHistory ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              />
            </Link>

            {/* Follows */}
            <Link
              href="/follows"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isFollows
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              aria-label="Đang theo dõi"
            >
              <Bookmark
                size={30}
                className={isFollows ? 'text-white fill-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
                fill={isFollows ? 'currentColor' : 'none'}
              />
            </Link>

            {/* Favorites */}
            <Link
              href="/favorites"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isFavorites
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              aria-label="Yêu thích"
            >
              <Heart
                size={30}
                className={isFavorites ? 'text-white fill-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
                fill={isFavorites ? 'currentColor' : 'none'}
              />
            </Link>

            {/* Author Dashboard - Only show for AUTHOR or ADMIN */}
            {isAuthorOrAdmin && (
              <Link
                href="/author/dashboard"
                className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isAuthorDashboard
                  ? 'bg-red-500 dark:bg-red-600'
                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                aria-label="Quản lý truyện"
              >
                <LayoutDashboard
                  size={30}
                  className={isAuthorDashboard ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
                />
              </Link>
            )}

            {/* Settings */}
            <Link
              href="/profile"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isProfile
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              aria-label="Cài đặt"
            >
              <Settings
                size={30}
                className={isProfile ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              />
            </Link>
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-4 py-2">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isHome
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            aria-label="Trang chủ"
          >
            <Home
              size={24}
              className={isHome ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            />
            <span className={`text-[10px] font-medium ${isHome ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              Trang chủ
            </span>
          </Link>

          <Link
            href="/history"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isHistory
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label="Lịch sử"
          >
            <Clock
              size={24}
              className={isHistory ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            />
            <span className={`text-[10px] font-medium ${isHistory ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>Lịch sử</span>
          </Link>

          <Link
            href="/follows"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isFollows
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label="Đang theo dõi"
          >
            <Bookmark
              size={24}
              className={isFollows ? 'text-white fill-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              fill={isFollows ? 'currentColor' : 'none'}
            />
            <span className={`text-[10px] font-medium ${isFollows ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>Theo dõi</span>
          </Link>

          <Link
            href="/favorites"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isFavorites
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label="Yêu thích"
          >
            <Heart
              size={24}
              className={isFavorites ? 'text-white fill-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              fill={isFavorites ? 'currentColor' : 'none'}
            />
            <span className={`text-[10px] font-medium ${isFavorites ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>Yêu thích</span>
          </Link>

          {/* Author Dashboard - Only show for AUTHOR or ADMIN */}
          {isAuthorOrAdmin && (
            <Link
              href="/author/dashboard"
              className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isAuthorDashboard
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              aria-label="Bảng điều khiển tác giả"
            >
              <LayoutDashboard
                size={24}
                className={isAuthorDashboard ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              />
              <span className={`text-[10px] font-medium ${isAuthorDashboard ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                Tác giả
              </span>
            </Link>
          )}

          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isProfile
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            aria-label="Cài đặt"
          >
            <Settings
              size={24}
              className={isProfile ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            />
            <span className={`text-[10px] font-medium ${isProfile ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              Cài đặt
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}

