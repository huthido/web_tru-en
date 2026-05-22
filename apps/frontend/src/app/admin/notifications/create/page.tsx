'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateNotification } from '@/lib/api/hooks/use-notifications';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

export default function CreateNotificationPage() {
    const router = useRouter();
    const createMutation = useCreateNotification();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'ANNOUNCEMENT' as any,
        priority: 'NORMAL' as any,
        targetRole: '' as any,
        sendEmail: false,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        if (!formData.title.trim()) {
            setErrors({ title: 'Vui lòng nhập tiêu đề' });
            return;
        }
        if (!formData.content.trim()) {
            setErrors({ content: 'Vui lòng nhập nội dung' });
            return;
        }

        try {
            await createMutation.mutateAsync({
                title: formData.title,
                content: formData.content,
                type: formData.type,
                priority: formData.priority,
                targetRole: formData.targetRole || undefined,
                sendEmail: formData.sendEmail,
            });

            showToast('Tạo thông báo thành công!', 'success');
            router.push('/admin/notifications');
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.error || 'Có lỗi xảy ra khi tạo thông báo';
            setErrors({ submit: errorMessage });
            showToast(errorMessage, 'error');
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href="/admin/notifications"
                            className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
                        >
                            <svg
                                className="w-6 h-6 text-on-surface-variant"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                                Tạo thông báo mới
                            </h1>
                            <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                                Gửi thông báo đến người dùng
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Tiêu đề <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Nhập tiêu đề thông báo..."
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                            )}
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Nội dung <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                rows={6}
                                className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                                placeholder="Nhập nội dung thông báo..."
                            />
                            {errors.content && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
                            )}
                        </div>

                        {/* Type & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Loại thông báo <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="ANNOUNCEMENT">Thông báo</option>
                                    <option value="SYSTEM_UPDATE">Cập nhật hệ thống</option>
                                    <option value="MAINTENANCE">Bảo trì</option>
                                    <option value="NEW_FEATURE">Tính năng mới</option>
                                    <option value="WARNING">Cảnh báo</option>
                                    <option value="INFO">Thông tin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Mức độ ưu tiên <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="LOW">Thấp</option>
                                    <option value="NORMAL">Bình thường</option>
                                    <option value="HIGH">Cao</option>
                                    <option value="URGENT">Khẩn cấp</option>
                                </select>
                            </div>
                        </div>

                        {/* Target Role */}
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Đối tượng nhận
                            </label>
                            <select
                                value={formData.targetRole}
                                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value as any })}
                                className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="">Tất cả người dùng</option>
                                <option value="USER">Chỉ USER</option>
                                <option value="AUTHOR">Chỉ AUTHOR</option>
                                <option value="ADMIN">Chỉ ADMIN</option>
                            </select>
                            <p className="mt-1 text-sm text-on-surface-variant">
                                Chọn nhóm người dùng sẽ nhận thông báo này
                            </p>
                        </div>

                        {/* Send Email */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="sendEmail"
                                checked={formData.sendEmail}
                                onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                                className="w-5 h-5 text-primary border-outline-variant rounded focus:ring-primary"
                            />
                            <label
                                htmlFor="sendEmail"
                                className="text-sm font-medium text-on-surface-variant cursor-pointer"
                            >
                                Gửi thông báo qua email
                            </label>
                        </div>

                        {formData.sendEmail && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg
                                        className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                                            Lưu ý khi gửi email
                                        </p>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                            Email sẽ được gửi đến tất cả người dùng đã xác thực email trong nhóm đối tượng được chọn. Quá trình này có thể mất vài phút.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {errors.submit && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-sm text-red-800 dark:text-red-300">{errors.submit}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4">
                        <Link
                            href="/admin/notifications"
                            className="px-6 py-3 border border-outline-variant text-on-surface-variant rounded-lg font-medium hover:bg-surface-container-high transition-colors"
                        >
                            Hủy
                        </Link>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                        />
                                    </svg>
                                    Tạo thông báo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
