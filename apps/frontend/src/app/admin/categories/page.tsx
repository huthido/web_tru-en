'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast } from '@/components/ui/toast';
import {
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
} from '@/lib/api/hooks/use-categories';
import { Category } from '@/lib/api/categories.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import * as XLSX from 'xlsx';

export default function AdminCategoriesPage() {
    const { data: categories, isLoading, refetch } = useCategories();
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();
    const { toasts, showToast, removeToast } = useToast();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    // Filter and sort categories
    const filteredAndSortedCategories = useMemo(() => {
        let filtered = (categories || []).filter((cat) =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Sort
        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortBy === 'name') {
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
            } else if (sortBy === 'createdAt') {
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [categories, searchTerm, sortBy, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedCategories.length / limit);
    const paginatedCategories = filteredAndSortedCategories.slice(
        (page - 1) * limit,
        page * limit
    );

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            showToast('Vui lòng nhập tên thể loại', 'error');
            return;
        }

        try {
            await createMutation.mutateAsync(formData);
            showToast('Tạo thể loại thành công', 'success');
            setIsCreating(false);
            setFormData({ name: '', description: '' });
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editingCategory) return;
        if (!formData.name.trim()) {
            showToast('Vui lòng nhập tên thể loại', 'error');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                id: editingCategory.id,
                data: formData,
            });
            showToast('Cập nhật thể loại thành công', 'success');
            setEditingCategory(null);
            setFormData({ name: '', description: '' });
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingCategory) return;

        try {
            await deleteMutation.mutateAsync(deletingCategory.id);
            showToast('Xóa thể loại thành công', 'success');
            setDeletingCategory(null);
            setSelectedCategories(new Set());
        } catch (error: any) {
            showToast(
                error?.response?.data?.error || 'Không thể xóa thể loại đang có truyện',
                'error'
            );
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCategories.size === 0) return;

        try {
            const promises = Array.from(selectedCategories).map((categoryId) =>
                deleteMutation.mutateAsync(categoryId)
            );

            await Promise.all(promises);
            showToast(`Đã xóa ${selectedCategories.size} thể loại`, 'success');
            setSelectedCategories(new Set());
        } catch (error: any) {
            showToast('Có lỗi xảy ra khi xóa thể loại', 'error');
        }
    };

    const handleExportExcel = () => {
        const exportData = filteredAndSortedCategories.map((category, index) => ({
            'STT': index + 1,
            'Tên thể loại': category.name,
            'Slug': category.slug,
            'Mô tả': category.description || '',
            'Ngày tạo': new Date(category.createdAt).toLocaleDateString('vi-VN'),
            'Ngày cập nhật': new Date(category.updatedAt).toLocaleDateString('vi-VN'),
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Thể loại');
        XLSX.writeFile(wb, `the_loai_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast('Đã xuất file Excel thành công', 'success');
    };

    const handleSelectAll = () => {
        if (selectedCategories.size === paginatedCategories.length) {
            setSelectedCategories(new Set());
        } else {
            setSelectedCategories(new Set(paginatedCategories.map((c) => c.id)));
        }
    };

    const handleSelectCategory = (categoryId: string) => {
        const newSelected = new Set(selectedCategories);
        if (newSelected.has(categoryId)) {
            newSelected.delete(categoryId);
        } else {
            newSelected.add(categoryId);
        }
        setSelectedCategories(newSelected);
    };

    const startEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
        });
        setIsCreating(false);
    };

    const startCreate = () => {
        setIsCreating(true);
        setEditingCategory(null);
        setFormData({ name: '', description: '' });
    };

    const cancelEdit = () => {
        setIsCreating(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '' });
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                            Quản lý thể loại
                        </h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                            Quản lý tất cả thể loại truyện trong hệ thống
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshButton onRefresh={() => refetch()} />
                        <button
                            onClick={startCreate}
                            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                        >
                            + Thêm thể loại
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Tổng thể loại</div>
                        <div className="text-2xl font-bold text-on-surface mt-1">
                            {categories?.length || 0}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Đang tìm kiếm</div>
                        <div className="text-2xl font-bold text-on-surface mt-1">
                            {filteredAndSortedCategories.length}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Đã chọn</div>
                        <div className="text-2xl font-bold text-on-surface mt-1">
                            {selectedCategories.size}
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Tìm kiếm thể loại..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1); // Reset to first page when searching
                                }}
                                className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value as 'name' | 'createdAt');
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                            >
                                <option value="name">Sắp xếp theo tên</option>
                                <option value="createdAt">Sắp xếp theo ngày tạo</option>
                            </select>
                            <button
                                onClick={() => {
                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors"
                                title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Xuất Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedCategories.size > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                                Đã chọn {selectedCategories.size} thể loại
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                    Xóa đã chọn
                                </button>
                                <button
                                    onClick={() => setSelectedCategories(new Set())}
                                    className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors text-sm"
                                >
                                    Bỏ chọn
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create/Edit Form */}
                {(isCreating || editingCategory) && (
                    <div className="bg-surface-container rounded-lg p-4 sm:p-6 border border-outline-variant">
                        <h2 className="text-lg sm:text-xl font-semibold text-on-surface mb-4">
                            {editingCategory ? 'Chỉnh sửa thể loại' : 'Thêm thể loại mới'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Tên thể loại <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="Nhập tên thể loại"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Mô tả
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={3}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="Nhập mô tả thể loại"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={editingCategory ? handleUpdate : handleCreate}
                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending ||
                                        !formData.name.trim()
                                    }
                                    className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingCategory ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Categories Table */}
                <div className="bg-surface-container rounded-lg border border-outline-variant overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-container-low">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={
                                                paginatedCategories.length > 0 &&
                                                selectedCategories.size === paginatedCategories.length
                                            }
                                            onChange={handleSelectAll}
                                            className="rounded border-outline-variant text-primary focus:ring-primary"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                        Tên thể loại
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                        Slug
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                        Mô tả
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                        Ngày tạo
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface-container divide-y divide-outline-variant">
                                {paginatedCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                                            {searchTerm ? 'Không tìm thấy thể loại nào' : 'Chưa có thể loại nào'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCategories.map((category) => (
                                        <tr
                                            key={category.id}
                                            className="hover:bg-surface-container-high transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.has(category.id)}
                                                    onChange={() => handleSelectCategory(category.id)}
                                                    className="rounded border-outline-variant text-primary focus:ring-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-on-surface">
                                                    {category.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm text-on-surface-variant">
                                                    {category.slug}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-on-surface-variant max-w-xs truncate">
                                                    {category.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm text-on-surface-variant">
                                                    {new Date(category.createdAt).toLocaleDateString('vi-VN')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => startEdit(category)}
                                                        className="text-primary hover:text-blue-900 dark:hover:text-blue-300"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingCategory(category)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">
                            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, filteredAndSortedCategories.length)} trong tổng số {filteredAndSortedCategories.length} thể loại
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Trước
                            </button>
                            <span className="px-4 py-2 text-sm text-on-surface-variant">
                                Trang {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deletingCategory && (
                <ConfirmModal
                    isOpen={!!deletingCategory}
                    onClose={() => setDeletingCategory(null)}
                    onConfirm={handleDelete}
                    title="Xác nhận xóa thể loại"
                    message={`Bạn có chắc chắn muốn xóa thể loại "${deletingCategory.name}"? Hành động này không thể hoàn tác.`}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    confirmColor="red"
                />
            )}
        </AdminLayout>
    );
}
