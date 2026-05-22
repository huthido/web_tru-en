'use client';

import { useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useNotifications, useDeleteNotification, useUpdateNotification } from '@/lib/api/hooks/use-notifications';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { 
    Bell, 
    Wrench, 
    Sparkles, 
    Megaphone, 
    AlertTriangle, 
    Info,
    Grid3x3,
    List,
    Clock,
    Users,
    Mail,
    Trash2,
    Power,
    PowerOff
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export default function AdminNotificationsPage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [isActiveFilter, setIsActiveFilter] = useState<string>('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
        isOpen: false,
        id: '',
        title: '',
    });

    const { data, isLoading } = useNotifications({
        page,
        limit,
        type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        isActive: isActiveFilter ? isActiveFilter === 'true' : undefined,
    });

    const deleteMutation = useDeleteNotification();
    const updateMutation = useUpdateNotification();
    const { toasts, showToast, removeToast } = useToast();

    const notifications = (data as any)?.data || [];
    const meta = (data as any)?.meta;

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(deleteModal.id);
            showToast('Xóa thông báo thành công', 'success');
            setDeleteModal({ isOpen: false, id: '', title: '' });
        } catch (error) {
            showToast('Có lỗi xảy ra khi xóa thông báo', 'error');
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateMutation.mutateAsync({
                id,
                data: { isActive: !currentStatus },
            });
            showToast(
                currentStatus ? 'Đã tắt thông báo' : 'Đã bật thông báo',
                'success'
            );
        } catch (error) {
            showToast('Có lỗi xảy ra', 'error');
        }
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, JSX.Element> = {
            SYSTEM_UPDATE: <Bell className="w-5 h-5" />,
            MAINTENANCE: <Wrench className="w-5 h-5" />,
            NEW_FEATURE: <Sparkles className="w-5 h-5" />,
            ANNOUNCEMENT: <Megaphone className="w-5 h-5" />,
            WARNING: <AlertTriangle className="w-5 h-5" />,
            INFO: <Info className="w-5 h-5" />,
        };
        return icons[type] || icons.INFO;
    };

    const getTypeConfig = (type: string) => {
        const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
            SYSTEM_UPDATE: {
                label: 'Cập nhật hệ thống',
                bg: 'bg-blue-50 dark:bg-blue-950/30',
                text: 'text-blue-700 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-800',
            },
            MAINTENANCE: {
                label: 'Bảo trì',
                bg: 'bg-yellow-50 dark:bg-yellow-950/30',
                text: 'text-yellow-700 dark:text-yellow-400',
                border: 'border-yellow-200 dark:border-yellow-800',
            },
            NEW_FEATURE: {
                label: 'Tính năng mới',
                bg: 'bg-purple-50 dark:bg-purple-950/30',
                text: 'text-purple-700 dark:text-purple-400',
                border: 'border-purple-200 dark:border-purple-800',
            },
            ANNOUNCEMENT: {
                label: 'Thông báo',
                bg: 'bg-green-50 dark:bg-green-950/30',
                text: 'text-green-700 dark:text-green-400',
                border: 'border-green-200 dark:border-green-800',
            },
            WARNING: {
                label: 'Cảnh báo',
                bg: 'bg-orange-50 dark:bg-orange-950/30',
                text: 'text-orange-700 dark:text-orange-400',
                border: 'border-orange-200 dark:border-orange-800',
            },
            INFO: {
                label: 'Thông tin',
                bg: 'bg-surface-container-low',
                text: 'text-on-surface-variant',
                border: 'border-outline-variant',
            },
        };
        return configs[type] || configs.INFO;
    };

    const getPriorityConfig = (priority: string) => {
        const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
            LOW: {
                label: 'Thấp',
                bg: 'bg-surface-container-high',
                text: 'text-on-surface-variant',
                dot: 'bg-outline',
            },
            NORMAL: {
                label: 'Bình thường',
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                text: 'text-blue-700 dark:text-blue-400',
                dot: 'bg-blue-500',
            },
            HIGH: {
                label: 'Cao',
                bg: 'bg-orange-100 dark:bg-orange-900/30',
                text: 'text-orange-700 dark:text-orange-400',
                dot: 'bg-orange-500',
            },
            URGENT: {
                label: 'Khẩn cấp',
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                dot: 'bg-red-500',
            },
        };
        return configs[priority] || configs.NORMAL;
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                            Quản lý thông báo hệ thống
                        </h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">
                            Tạo và quản lý thông báo gửi đến người dùng
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-surface-container border border-outline-variant rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-primary text-on-primary'
                                        : 'text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                                title="Dạng lưới"
                            >
                                <Grid3x3 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-primary text-on-primary'
                                        : 'text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                                title="Dạng danh sách"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                        <Link
                            href="/admin/notifications/create"
                            className="px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-blue-500/30"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tạo mới
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-surface-container rounded-xl p-4 sm:p-6 shadow-sm border border-outline-variant">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Loại thông báo
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">Tất cả loại</option>
                                <option value="SYSTEM_UPDATE">Cập nhật hệ thống</option>
                                <option value="MAINTENANCE">Bảo trì</option>
                                <option value="NEW_FEATURE">Tính năng mới</option>
                                <option value="ANNOUNCEMENT">Thông báo</option>
                                <option value="WARNING">Cảnh báo</option>
                                <option value="INFO">Thông tin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Mức độ ưu tiên
                            </label>
                            <select
                                value={priorityFilter}
                                onChange={(e) => {
                                    setPriorityFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">Tất cả mức độ</option>
                                <option value="LOW">Thấp</option>
                                <option value="NORMAL">Bình thường</option>
                                <option value="HIGH">Cao</option>
                                <option value="URGENT">Khẩn cấp</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={isActiveFilter}
                                onChange={(e) => {
                                    setIsActiveFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="true">Đang hoạt động</option>
                                <option value="false">Đã tắt</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notifications Content */}
                {isLoading ? (
                    <Loading />
                ) : notifications.length === 0 ? (
                    <div className="bg-surface-container rounded-xl p-12 text-center border border-outline-variant">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-container-high mb-4">
                            <Bell className="w-10 h-10 text-on-surface-variant" />
                        </div>
                        <h3 className="text-lg font-semibold text-on-surface mb-2">
                            Chưa có thông báo nào
                        </h3>
                        <p className="text-on-surface-variant mb-6">
                            Tạo thông báo đầu tiên để gửi đến người dùng
                        </p>
                        <Link
                            href="/admin/notifications/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tạo thông báo mới
                        </Link>
                    </div>
                ) : viewMode === 'grid' ? (
                    // Grid View
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {notifications.map((notification: any) => {
                            const typeConfig = getTypeConfig(notification.type);
                            const priorityConfig = getPriorityConfig(notification.priority);
                            return (
                                <div
                                    key={notification.id}
                                    className={`group relative bg-surface-container rounded-xl shadow-sm border-2 ${typeConfig.border} hover:shadow-lg transition-all duration-300 overflow-hidden`}
                                >
                                    {/* Type Banner */}
                                    <div className={`${typeConfig.bg} ${typeConfig.text} px-4 py-3 flex items-center justify-between border-b-2 ${typeConfig.border}`}>
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(notification.type)}
                                            <span className="font-semibold text-sm">
                                                {typeConfig.label}
                                            </span>
                                        </div>
                                        {/* Priority Badge */}
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${priorityConfig.bg} ${priorityConfig.text}`}>
                                            <div className={`w-2 h-2 rounded-full ${priorityConfig.dot} animate-pulse`} />
                                            <span className="text-xs font-semibold">{priorityConfig.label}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-on-surface mb-2 line-clamp-2 min-h-[3.5rem]">
                                            {notification.title}
                                        </h3>
                                        <p className="text-sm text-on-surface-variant mb-4 line-clamp-3 min-h-[4.5rem]">
                                            {notification.content}
                                        </p>

                                        {/* Stats */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{notification._count?.recipients || 0} người nhận</span>
                                                {notification.targetRole && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="px-2 py-0.5 bg-surface-container-high rounded text-xs font-medium">
                                                            {notification.targetRole}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {notification.sendEmail && (
                                                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    <span>Đã gửi email</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pt-4 border-t border-outline-variant">
                                            <button
                                                onClick={() => toggleActive(notification.id, notification.isActive)}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    notification.isActive
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                                }`}
                                                title={notification.isActive ? 'Tắt thông báo' : 'Bật thông báo'}
                                            >
                                                {notification.isActive ? (
                                                    <>
                                                        <Power className="w-4 h-4" />
                                                        <span>Hoạt động</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PowerOff className="w-4 h-4" />
                                                        <span>Đã tắt</span>
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setDeleteModal({
                                                        isOpen: true,
                                                        id: notification.id,
                                                        title: notification.title,
                                                    })
                                                }
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                                                title="Xóa thông báo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Status Indicator */}
                                    {!notification.isActive && (
                                        <div className="absolute top-3 right-3 w-3 h-3 bg-outline rounded-full" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // List View
                    <div className="space-y-4">
                        {notifications.map((notification: any) => {
                            const typeConfig = getTypeConfig(notification.type);
                            const priorityConfig = getPriorityConfig(notification.priority);
                            return (
                                <div
                                    key={notification.id}
                                    className={`bg-surface-container rounded-xl p-6 shadow-sm border-l-4 ${typeConfig.border} hover:shadow-md transition-all`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <div className={`flex items-center gap-2 ${typeConfig.text}`}>
                                                    {getTypeIcon(notification.type)}
                                                    <span className="font-semibold text-sm">
                                                        {typeConfig.label}
                                                    </span>
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${priorityConfig.bg} ${priorityConfig.text}`}>
                                                    <div className={`w-2 h-2 rounded-full ${priorityConfig.dot}`} />
                                                    <span className="text-xs font-semibold">{priorityConfig.label}</span>
                                                </div>
                                                {notification.sendEmail && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">Email</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-on-surface mb-2">
                                                {notification.title}
                                            </h3>
                                            <p className="text-on-surface-variant mb-3 line-clamp-2">
                                                {notification.content}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-4 h-4" />
                                                    <span>{notification._count?.recipients || 0} người nhận</span>
                                                </div>
                                                {notification.targetRole && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Đối tượng: {notification.targetRole}</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{new Date(notification.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleActive(notification.id, notification.isActive)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    notification.isActive
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                                }`}
                                            >
                                                {notification.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                                {notification.isActive ? 'Hoạt động' : 'Đã tắt'}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setDeleteModal({
                                                        isOpen: true,
                                                        id: notification.id,
                                                        title: notification.title,
                                                    })
                                                }
                                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container rounded-xl p-4 shadow-sm border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">
                            Hiển thị <span className="font-semibold text-on-surface">{notifications.length}</span> trong tổng số{' '}
                            <span className="font-semibold text-on-surface">{meta.total}</span> thông báo
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors font-medium text-sm"
                            >
                                ← Trước
                            </button>
                            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-primary rounded-lg font-semibold text-sm">
                                {page} / {meta.totalPages}
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                disabled={page >= meta.totalPages}
                                className="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors font-medium text-sm"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
                onConfirm={handleDelete}
                title="Xác nhận xóa thông báo"
                message={`Bạn có chắc chắn muốn xóa thông báo "${deleteModal.title}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmColor="red"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
