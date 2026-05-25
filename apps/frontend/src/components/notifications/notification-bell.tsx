'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUnreadCount, useMyNotifications, useMarkAsRead, useNotificationStream } from '@/lib/api/hooks/use-notifications';
import { useAuth } from '@/lib/api/hooks/use-auth';

export function NotificationBell() {
    const { user } = useAuth();
    const { isStreamActive } = useNotificationStream(!!user);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Khi SSE alive, tắt polling 30s; SSE realtime + invalidate đủ giữ badge tươi.
    const { data: unreadData } = useUnreadCount({ sseActive: isStreamActive });
    const { data: notificationsData } = useMyNotifications({ limit: 5, isRead: false });
    const markAsReadMutation = useMarkAsRead();

    const unreadCount = (unreadData as any)?.count || 0;
    const notifications = (notificationsData as any)?.data || [];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkAsRead = async (recipientId: string) => {
        try {
            await markAsReadMutation.mutateAsync(recipientId);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            // Admin broadcast
            SYSTEM_UPDATE: '🔄',
            MAINTENANCE: '🔧',
            NEW_FEATURE: '✨',
            ANNOUNCEMENT: '📢',
            WARNING: '⚠️',
            INFO: 'ℹ️',
            // Auto user events
            STORY_APPROVED: '✅',
            STORY_REJECTED: '❌',
            STORY_NEW_CHAPTER: '📖',
            DONATION_RECEIVED: '💝',
            CHAPTER_PURCHASED: '🛒',
            STORY_PURCHASED: '👑',
            WITHDRAWAL_PROCESSED: '💸',
            COIN_TRANSFER_RECEIVED: '💰',
            COIN_DEPOSITED: '⬆️',
            COMMENT_REPLY: '💬',
        };
        return icons[type] || '📬';
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            LOW: 'text-on-surface-variant',
            NORMAL: 'text-primary',
            HIGH: 'text-orange-600 dark:text-orange-400',
            URGENT: 'text-red-600 dark:text-red-400',
        };
        return colors[priority] || colors.NORMAL;
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-on-surface-variant hover:text-on-surface dark:hover:text-white hover:bg-surface-container-high rounded-lg transition-colors"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown — mobile: explicit left-2 right-2 + force w-auto để
                tránh Tailwind shorthand quirk. Wrapper outer overflow-hidden +
                inner list dùng `[&::-webkit-scrollbar]:w-1` để scrollbar mỏng
                1px (globals.css default 14px sẽ tạo gap visible bên phải). */}
            {isOpen && (
                <div className="fixed left-2 right-2 top-[64px] md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-96 bg-surface-container rounded-lg shadow-xl border border-outline-variant z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    {/* Header — stretch full với justify-between */}
                    <div className="w-full px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                        <h3 className="text-base md:text-lg font-semibold text-on-surface">
                            Thông báo
                        </h3>
                        {unreadCount > 0 && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full flex-shrink-0">
                                {unreadCount} mới
                            </span>
                        )}
                    </div>

                    {/* Notifications List — scrollbar mỏng để không chiếm width
                        right (default globals.css ::-webkit-scrollbar 14px tạo
                        gap visible). 4px webkit scrollbar overlay style. */}
                    <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-outline-variant [&::-webkit-scrollbar-thumb]:rounded-full">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <svg
                                    className="w-12 h-12 mx-auto text-on-surface-variant mb-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                    />
                                </svg>
                                <p className="text-sm text-on-surface-variant">
                                    Không có thông báo mới
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-outline-variant">
                                {notifications.map((notification: any) => (
                                    <Link
                                        key={notification.id}
                                        href={notification.actionUrl || '/notifications'}
                                        onClick={() => {
                                            if (!notification.isRead) {
                                                handleMarkAsRead(notification.recipientId);
                                            }
                                            setIsOpen(false);
                                        }}
                                        className="block w-full px-4 py-3 hover:bg-surface-container-high/50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start gap-3 w-full">
                                            <span className="text-2xl flex-shrink-0">
                                                {getTypeIcon(notification.type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-semibold line-clamp-1 mb-1 ${getPriorityColor(notification.priority)}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-sm text-on-surface-variant line-clamp-2 break-words">
                                                    {notification.content}
                                                </p>
                                                <p className="text-xs text-on-surface-variant mt-1">
                                                    {new Date(notification.createdAt).toLocaleDateString('vi-VN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="w-full px-4 py-3 border-t border-outline-variant">
                            <Link
                                href="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center text-sm font-medium text-primary hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                Xem tất cả thông báo
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
