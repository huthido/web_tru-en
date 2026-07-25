'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useMyNotifications, useMarkAsRead, useMarkAllAsRead } from '@/lib/api/hooks/use-notifications';

export default function NotificationsPage() {
    const [page, setPage] = useState(1);
    const [isReadFilter, setIsReadFilter] = useState<string>('');

    const { data, isLoading } = useMyNotifications({
        page,
        limit: 20,
        isRead: isReadFilter ? isReadFilter === 'true' : undefined,
    });

    const markAsReadMutation = useMarkAsRead();
    const markAllAsReadMutation = useMarkAllAsRead();

    const notifications = (data as any)?.data || [];
    const meta = (data as any)?.meta;

    const handleMarkAsRead = async (recipientId: string) => {
        try {
            await markAsReadMutation.mutateAsync(recipientId);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsReadMutation.mutateAsync();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            SYSTEM_UPDATE: '🔄',
            MAINTENANCE: '🔧',
            NEW_FEATURE: '✨',
            ANNOUNCEMENT: '📢',
            WARNING: '⚠️',
            INFO: 'ℹ️',
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

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            SYSTEM_UPDATE: 'Cập nhật hệ thống',
            MAINTENANCE: 'Bảo trì',
            NEW_FEATURE: 'Tính năng mới',
            ANNOUNCEMENT: 'Thông báo',
            WARNING: 'Cảnh báo',
            INFO: 'Thông tin',
            STORY_APPROVED: 'Truyện được duyệt',
            STORY_REJECTED: 'Truyện bị từ chối',
            STORY_NEW_CHAPTER: 'Chương mới',
            DONATION_RECEIVED: 'Nhận ủng hộ',
            CHAPTER_PURCHASED: 'Bán chương',
            STORY_PURCHASED: 'Bán truyện',
            WITHDRAWAL_PROCESSED: 'Rút xu',
            COIN_TRANSFER_RECEIVED: 'Nhận xu',
            COIN_DEPOSITED: 'Nạp xu',
            COMMENT_REPLY: 'Trả lời bình luận',
        };
        return labels[type] || type;
    };

    const getPriorityBadge = (priority: string) => {
        const badges: Record<string, { bg: string; text: string }> = {
            LOW: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
            NORMAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
            HIGH: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
            URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
        };
        const badge = badges[priority] || badges.NORMAL;
        const labels: Record<string, string> = {
            LOW: 'Thấp',
            NORMAL: 'Bình thường',
            HIGH: 'Cao',
            URGENT: 'Khẩn cấp',
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                {labels[priority] || priority}
            </span>
        );
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">
                            {/* Header */}
                            <div className="mb-6">
                                <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
                                    Thông báo
                                </h1>
                                <p className="text-on-surface-variant">
                                    Tất cả thông báo từ hệ thống
                                </p>
                            </div>

                            {/* Filters */}
                            <div className="bg-surface-container rounded-lg p-4 mb-6 shadow-sm border border-outline-variant">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <select
                                        value={isReadFilter}
                                        onChange={(e) => {
                                            setIsReadFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="false">Chưa đọc</option>
                                        <option value="true">Đã đọc</option>
                                    </select>

                                    {notifications.some((n: any) => !n.isRead) && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            disabled={markAllAsReadMutation.isPending}
                                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {markAllAsReadMutation.isPending ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Notifications List */}
                            {isLoading ? (
                                <Loading />
                            ) : notifications.length === 0 ? (
                                <div className="bg-surface-container rounded-lg p-12 text-center border border-outline-variant">
                                    <svg
                                        className="w-16 h-16 mx-auto text-on-surface-variant mb-4"
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
                                    <p className="text-on-surface-variant">
                                        {isReadFilter === 'false' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {notifications.map((notification: any) => {
                                        const RowWrapper: any = notification.actionUrl ? Link : 'div';
                                        const wrapperProps: any = notification.actionUrl
                                            ? {
                                                  href: notification.actionUrl,
                                                  onClick: () => {
                                                      if (!notification.isRead) {
                                                          handleMarkAsRead(notification.recipientId);
                                                      }
                                                  },
                                              }
                                            : {};
                                        return (
                                            <RowWrapper
                                                key={notification.id}
                                                {...wrapperProps}
                                                className={`block bg-surface-container rounded-lg p-6 shadow-sm border transition-all ${
                                                    notification.actionUrl ? 'hover:shadow-md cursor-pointer' : ''
                                                } ${
                                                    notification.isRead
                                                        ? 'border-outline-variant'
                                                        : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <span className="text-3xl flex-shrink-0">
                                                        {getTypeIcon(notification.type)}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                            <h3 className="text-lg font-semibold text-on-surface">
                                                                {notification.title}
                                                            </h3>
                                                            {getPriorityBadge(notification.priority)}
                                                            <span className="px-2 py-1 rounded text-xs font-medium bg-surface-container-high text-on-surface-variant">
                                                                {getTypeLabel(notification.type)}
                                                            </span>
                                                            {!notification.isRead && (
                                                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                            )}
                                                        </div>
                                                        <p className="text-on-surface-variant mb-3 whitespace-pre-wrap">
                                                            {notification.content}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm text-on-surface-variant">
                                                                {new Date(notification.createdAt).toLocaleDateString('vi-VN', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                            {!notification.isRead && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleMarkAsRead(notification.recipientId);
                                                                    }}
                                                                    disabled={markAsReadMutation.isPending}
                                                                    className="text-sm text-primary hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    Đánh dấu đã đọc
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </RowWrapper>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            {meta && meta.totalPages > 1 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="text-sm text-on-surface-variant">
                                        Trang {page} / {meta.totalPages} ({meta.total} thông báo)
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                        >
                                            Trước
                                        </button>
                                        <button
                                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                            disabled={page >= meta.totalPages}
                                            className="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </ProtectedRoute>
    );
}
