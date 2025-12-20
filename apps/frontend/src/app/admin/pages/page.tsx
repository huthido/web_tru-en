'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { usePages, useCreatePage, useUpdatePage, useDeletePage } from '@/lib/api/hooks/use-pages';
import { Page, CreatePageRequest } from '@/lib/api/pages.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { ToastContainer } from '@/components/ui/toast';
import { RichTextEditor } from '@/components/editor/rich-text-editor';

export default function AdminPagesPage() {
    const { data: pages, isLoading, refetch } = usePages();
    const createMutation = useCreatePage();
    const updateMutation = useUpdatePage();
    const deleteMutation = useDeletePage();
    const { toasts, showToast, removeToast } = useToast();

    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingPage, setDeletingPage] = useState<Page | null>(null);
    const [formData, setFormData] = useState<CreatePageRequest>({
        slug: '',
        title: '',
        content: '',
        description: '',
        isActive: true,
    });

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync(formData);
            showToast('Tạo trang thành công', 'success');
            setIsCreating(false);
            setFormData({ slug: '', title: '', content: '', description: '', isActive: true });
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editingPage) return;
        try {
            await updateMutation.mutateAsync({
                slug: editingPage.slug,
                data: {
                    title: formData.title,
                    content: formData.content,
                    description: formData.description,
                    isActive: formData.isActive,
                },
            });
            showToast('Cập nhật trang thành công', 'success');
            setEditingPage(null);
            setFormData({ slug: '', title: '', content: '', description: '', isActive: true });
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingPage) return;
        try {
            await deleteMutation.mutateAsync(deletingPage.slug);
            showToast('Xóa trang thành công', 'success');
            setDeletingPage(null);
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleEdit = (page: Page) => {
        setEditingPage(page);
        setFormData({
            slug: page.slug,
            title: page.title,
            content: page.content,
            description: page.description || '',
            isActive: page.isActive,
        });
        setIsCreating(false);
    };

    const handleNew = () => {
        setIsCreating(true);
        setEditingPage(null);
        setFormData({ slug: '', title: '', content: '', description: '', isActive: true });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingPage(null);
        setFormData({ slug: '', title: '', content: '', description: '', isActive: true });
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <Loading />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            Quản lý trang nội dung
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Quản lý nội dung các trang tĩnh trên website
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshButton onRefresh={refetch} />
                        <button
                            onClick={handleNew}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tạo trang mới
                        </button>
                    </div>
                </div>

                {/* Create/Edit Form */}
                {(isCreating || editingPage) && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            {isCreating ? 'Tạo trang mới' : 'Chỉnh sửa trang'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Slug (URL) {!isCreating && <span className="text-gray-500">(không thể thay đổi)</span>}
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    disabled={!isCreating}
                                    placeholder="lien-he-quang-cao"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tiêu đề
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Liên hệ quảng cáo"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mô tả
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mô tả ngắn về trang"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nội dung
                                </label>
                                <RichTextEditor
                                    value={formData.content}
                                    onChange={(value) => setFormData({ ...formData, content: value })}
                                    placeholder="Nhập nội dung..."
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                                    Kích hoạt
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={isCreating ? handleCreate : handleUpdate}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isCreating ? 'Tạo' : 'Cập nhật'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pages List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Slug
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tiêu đề
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Cập nhật
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {pages && pages.length > 0 ? (
                                    pages.map((page) => (
                                        <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                                                {page.slug}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                {page.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${page.isActive
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    {page.isActive ? 'Hoạt động' : 'Tắt'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(page.updatedAt).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(page)}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingPage(page)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Chưa có trang nào
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deletingPage && (
                <ConfirmModal
                    isOpen={!!deletingPage}
                    onClose={() => setDeletingPage(null)}
                    onConfirm={handleDelete}
                    title="Xác nhận xóa trang"
                    message={`Bạn có chắc muốn xóa trang "${deletingPage.title}"? Hành động này không thể hoàn tác.`}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    confirmColor="red"
                />
            )}

            {/* Toast Container */}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </AdminLayout>
    );
}

