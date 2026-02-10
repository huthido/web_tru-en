'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { ProtectedRoute } from './protected-route';
import { UserRole } from '@shared/types';
import { useTheme } from '@/components/providers/theme-provider';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const menuItems = [
        {
            title: 'Dashboard',
            href: '/admin',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
        },
        {
            title: 'Quản lý người dùng',
            href: '/admin/users',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            title: 'Quản lý quảng cáo',
            href: '/admin/ads',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                </svg>
            ),
        },
        {
            title: 'Quản lý gói xu',
            href: '/admin/coin-packages',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                    <path d="M12 18V6" />
                </svg>
            ),
        },
        {
            title: 'Duyệt truyện',
            href: '/admin/approvals',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ),
        },
        {
            title: 'Quản lý truyện',
            href: '/admin/stories',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            ),
        },
        {
            title: 'Quản lý chương',
            href: '/admin/chapters',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            ),
        },
        {
            title: 'Quản lý thể loại',
            href: '/admin/categories',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4z" />
                </svg>
            ),
        },
        {
            title: 'Quản lý trang nội dung',
            href: '/admin/pages',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            ),
        },
        {
            title: 'Quản lý bình luận',
            href: '/admin/comments',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
        },
        {
            title: 'Thống kê',
            href: '/admin/statistics',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            ),
        },
        {
            title: 'Thông báo hệ thống',
            href: '/admin/notifications',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            ),
        },
        {
            title: 'Cài đặt',
            href: '/admin/settings',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                </svg>
            ),
        },
    ];

    return (
        <ProtectedRoute requiredRole={[UserRole.ADMIN]}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Admin Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                    <div className="flex items-center justify-between px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Toggle sidebar"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            </button>
                            <Link href="/admin" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                <span className="hidden sm:inline">Admin Panel</span>
                                <span className="sm:hidden">Admin</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500">
                                        <circle cx="12" cy="12" r="5" />
                                        <line x1="12" y1="1" x2="12" y2="3" />
                                        <line x1="12" y1="21" x2="12" y2="23" />
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                        <line x1="1" y1="12" x2="3" y2="12" />
                                        <line x1="21" y1="12" x2="23" y2="12" />
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                    </svg>
                                )}
                            </button>
                            <Link
                                href="/"
                                className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                Về trang chủ
                            </Link>
                            {user && (
                                <div className="flex items-center gap-2">
                                    <div className="hidden sm:block text-right">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName || user.username}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
                                    </div>
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                            {(user.displayName || user.username)[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex h-[calc(100vh-64px)] relative">
                    {/* Mobile Overlay */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* Admin Sidebar */}
                    <aside
                        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 h-full fixed lg:static z-50 ${isSidebarOpen ? 'w-64' : 'w-0 lg:w-0 overflow-hidden'
                            }`}
                    >
                        <nav className="p-3 sm:p-4 space-y-2 h-full overflow-y-auto">
                            {menuItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => {
                                            // Close sidebar on mobile when clicking a link
                                            if (window.innerWidth < 1024) {
                                                setIsSidebarOpen(false);
                                            }
                                        }}
                                        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="font-medium text-sm sm:text-base">{item.title}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 transition-all duration-300 w-full lg:w-auto">
                        <div className="p-3 sm:p-4 md:p-6">{children}</div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}

