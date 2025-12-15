'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isHome = pathname === '/';
  const isProfile = pathname === '/profile';
  const isHistory = pathname === '/history';
  const isFavorites = pathname === '/favorites';
  const isAuthorDashboard = pathname?.startsWith('/author/dashboard');
  const isChapterManagement = pathname?.includes('/author/stories/') && pathname?.includes('/chapters');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if user is author or admin
  const isAuthorOrAdmin = user && (user.role === 'AUTHOR' || user.role === 'ADMIN');
  const isAdmin = user && user.role === 'ADMIN';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[120px] flex-col items-center py-8 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-300 z-40">
        <div className="flex flex-col items-center gap-12">
          {/* Logo */}
          <Link
            href="/"
            className="w-[60px] h-[60px] flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95"
          >
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
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-12">
            {/* Home */}
            <Link
              href="/"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isHome
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              aria-label="Trang chủ"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={isHome ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              >
                <path
                  d="M34.2672 16.9812L21.7672 4.48117C21.2984 4.01268 20.6628 3.74951 20 3.74951C19.3373 3.74951 18.7016 4.01268 18.2328 4.48117L5.73283 16.9812C5.49955 17.2127 5.31464 17.4883 5.18883 17.792C5.06303 18.0956 4.99885 18.4212 5.00002 18.7499V33.7499C5.00002 34.0814 5.13171 34.3994 5.36613 34.6338C5.60055 34.8682 5.9185 34.9999 6.25002 34.9999H33.75C34.0815 34.9999 34.3995 34.8682 34.6339 34.6338C34.8683 34.3994 35 34.0814 35 33.7499V18.7499C35.0012 18.4212 34.937 18.0956 34.8112 17.792C34.6854 17.4883 34.5005 17.2127 34.2672 16.9812ZM32.5 32.4999H7.50002V18.7499L20 6.24992L32.5 18.7499V32.4999Z"
                  fill="currentColor"
                />
              </svg>
            </Link>

            {/* History */}
            <Link
              href="/history"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isHistory
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              aria-label="Lịch sử"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 40 40"
                fill="none"
                className={isHistory ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              >
                <path
                  d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C28.2843 35 35 28.2843 35 20C35 11.7157 28.2843 5 20 5Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 10V20L25 25"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            {/* Favorites */}
            <Link
              href="/favorites"
              className={`w-[50px] h-[50px] flex items-center justify-center rounded-[10px] transition-all duration-300 hover:scale-110 active:scale-95 ${isFavorites
                ? 'bg-red-500 dark:bg-red-600'
                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              aria-label="Yêu thích"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 40 40"
                fill="none"
                className={isFavorites ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              >
                <path
                  d="M20 8.33333C15.8333 3.33333 8.33333 4.16667 8.33333 12.5C8.33333 20.8333 20 31.6667 20 31.6667C20 31.6667 31.6667 20.8333 31.6667 12.5C31.6667 4.16667 24.1667 3.33333 20 8.33333Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
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
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={isAuthorDashboard ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
                >
                  <path
                    d="M6.66667 5H33.3333C34.2174 5 35.0652 5.35119 35.6904 5.97631C36.3155 6.60143 36.6667 7.44928 36.6667 8.33333V31.6667C36.6667 32.5507 36.3155 33.3986 35.6904 34.0237C35.0652 34.6488 34.2174 35 33.3333 35H6.66667C5.78261 35 4.93477 34.6488 4.30964 34.0237C3.68452 33.3986 3.33333 32.5507 3.33333 31.6667V8.33333C3.33333 7.44928 3.68452 6.60143 4.30964 5.97631C4.93477 5.35119 5.78261 5 6.66667 5Z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.33333 13.3333H36.6667"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3333 8.33333V18.3333"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M26.6667 8.33333V18.3333"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
              <svg
                width="30"
                height="30"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={isProfile ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              >
                <path
                  d="M8.33301 16.6666H11.6663C14.9997 16.6666 16.6663 14.9999 16.6663 11.6666V8.33325C16.6663 4.99992 14.9997 3.33325 11.6663 3.33325H8.33301C4.99967 3.33325 3.33301 4.99992 3.33301 8.33325V11.6666C3.33301 14.9999 4.99967 16.6666 8.33301 16.6666Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M28.333 16.6666H31.6663C34.9997 16.6666 36.6663 14.9999 36.6663 11.6666V8.33325C36.6663 4.99992 34.9997 3.33325 31.6663 3.33325H28.333C24.9997 3.33325 23.333 4.99992 23.333 8.33325V11.6666C23.333 14.9999 24.9997 16.6666 28.333 16.6666Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M28.333 36.6666H31.6663C34.9997 36.6666 36.6663 34.9999 36.6663 31.6666V28.3333C36.6663 24.9999 34.9997 23.3333 31.6663 23.3333H28.333C24.9997 23.3333 23.333 24.9999 23.333 28.3333V31.6666C23.333 34.9999 24.9997 36.6666 28.333 36.6666Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.33301 36.6666H11.6663C14.9997 36.6666 16.6663 34.9999 16.6663 31.6666V28.3333C16.6663 24.9999 14.9997 23.3333 11.6663 23.3333H8.33301C4.99967 23.3333 3.33301 24.9999 3.33301 28.3333V31.6666C3.33301 34.9999 4.99967 36.6666 8.33301 36.6666Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={isHome ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            >
              <path
                d="M34.2672 16.9812L21.7672 4.48117C21.2984 4.01268 20.6628 3.74951 20 3.74951C19.3373 3.74951 18.7016 4.01268 18.2328 4.48117L5.73283 16.9812C5.49955 17.2127 5.31464 17.4883 5.18883 17.792C5.06303 18.0956 4.99885 18.4212 5.00002 18.7499V33.7499C5.00002 34.0814 5.13171 34.3994 5.36613 34.6338C5.60055 34.8682 5.9185 34.9999 6.25002 34.9999H33.75C34.0815 34.9999 34.3995 34.8682 34.6339 34.6338C34.8683 34.3994 35 34.0814 35 33.7499V18.7499C35.0012 18.4212 34.937 18.0956 34.8112 17.792C34.6854 17.4883 34.5005 17.2127 34.2672 16.9812ZM32.5 32.4999H7.50002V18.7499L20 6.24992L32.5 18.7499V32.4999Z"
                fill="currentColor"
              />
            </svg>
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 40 40"
              fill="none"
              className={isHistory ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            >
              <path
                d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C28.2843 35 35 28.2843 35 20C35 11.7157 28.2843 5 20 5Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 10V20L25 25"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={`text-[10px] font-medium ${isHistory ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>Lịch sử</span>
          </Link>

          <Link
            href="/favorites"
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-all duration-300 ${isFavorites
              ? 'bg-red-500 dark:bg-red-600'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-label="Yêu thích"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 40 40"
              fill="none"
              className={isFavorites ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            >
              <path
                d="M20 8.33333C15.8333 3.33333 8.33333 4.16667 8.33333 12.5C8.33333 20.8333 20 31.6667 20 31.6667C20 31.6667 31.6667 20.8333 31.6667 12.5C31.6667 4.16667 24.1667 3.33333 20 8.33333Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={isFavorites ? 'currentColor' : 'none'}
              />
            </svg>
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
              <svg
                width="24"
                height="24"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={isAuthorDashboard ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
              >
                <path
                  d="M3.33301 10H36.6663V30H3.33301V10Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 15H15"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 20H20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M25 15H30"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={isProfile ? 'text-white' : 'text-gray-900 dark:text-white transition-colors duration-300'}
            >
              <path
                d="M8.33301 16.6666H11.6663C14.9997 16.6666 16.6663 14.9999 16.6663 11.6666V8.33325C16.6663 4.99992 14.9997 3.33325 11.6663 3.33325H8.33301C4.99967 3.33325 3.33301 4.99992 3.33301 8.33325V11.6666C3.33301 14.9999 4.99967 16.6666 8.33301 16.6666Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M28.333 16.6666H31.6663C34.9997 16.6666 36.6663 14.9999 36.6663 11.6666V8.33325C36.6663 4.99992 34.9997 3.33325 31.6663 3.33325H28.333C24.9997 3.33325 23.333 4.99992 23.333 8.33325V11.6666C23.333 14.9999 24.9997 16.6666 28.333 16.6666Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M28.333 36.6666H31.6663C34.9997 36.6666 36.6663 34.9999 36.6663 31.6666V28.3333C36.6663 24.9999 34.9997 23.3333 31.6663 23.3333H28.333C24.9997 23.3333 23.333 24.9999 23.333 28.3333V31.6666C23.333 34.9999 24.9997 36.6666 28.333 36.6666Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.33301 36.6666H11.6663C14.9997 36.6666 16.6663 34.9999 16.6663 31.6666V28.3333C16.6663 24.9999 14.9997 23.3333 11.6663 23.3333H8.33301C4.99967 23.3333 3.33301 24.9999 3.33301 28.3333V31.6666C3.33301 34.9999 4.99967 36.6666 8.33301 36.6666Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={`text-[10px] font-medium ${isProfile ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              Cài đặt
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}

