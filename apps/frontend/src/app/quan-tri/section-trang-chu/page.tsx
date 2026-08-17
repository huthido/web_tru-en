'use client';

import { useState } from 'react';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import {
    useHomepageSectionsAdmin,
    useCreateHomepageSection,
    useUpdateHomepageSection,
    useDeleteHomepageSection,
    useReorderHomepageSections,
    useSeedHomepageSections,
    HomepageSection,
} from '@/lib/api/hooks/use-homepage-sections';

const SORT_PATH_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'best-of-month', label: 'Hay nhất tháng' },
    { value: 'top-rated', label: 'Đánh giá cao' },
    { value: 'recommended', label: 'Đề xuất' },
    { value: 'most-liked', label: 'Yêu thích' },
];

const SORT_BY_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'popular', label: 'Phổ biến' },
    { value: 'rating', label: 'Đánh giá' },
    { value: 'viewCount', label: 'Lượt xem' },
];

export default function AdminHomepageSectionsPage() {
    const { data: sections, isLoading, refetch } = useHomepageSectionsAdmin();
    const createMutation = useCreateHomepageSection();
    const updateMutation = useUpdateHomepageSection();
    const deleteMutation = useDeleteHomepageSection();
    const reorderMutation = useReorderHomepageSections();
    const seedMutation = useSeedHomepageSections();
    const { toasts, showToast, removeToast } = useToast();

    const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
    const [deletingSection, setDeletingSection] = useState<HomepageSection | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        key: '',
        label: '',
        sortPath: 'newest',
        limit: 15,
        seeMorePath: '/truyen',
        sortBy: 'newest',
        isActive: true,
        order: 0,
    });

    const handleCreate = async () => {
        if (!formData.key.trim() || !formData.label.trim()) {
            showToast('Vui lòng nhập key và label', 'error');
            return;
        }
        try {
            await createMutation.mutateAsync(formData);
            showToast('Tạo section thành công', 'success');
            setIsCreating(false);
            setFormData({ key: '', label: '', sortPath: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', isActive: true, order: 0 });
        } catch (error: any) {
            showToast(error?.response?.data?.message || error?.response?.data?.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editingSection) return;
        try {
            await updateMutation.mutateAsync({ id: editingSection.id, data: formData });
            showToast('Cập nhật thành công', 'success');
            setEditingSection(null);
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deletingSection) return;
        try {
            await deleteMutation.mutateAsync(deletingSection.id);
            showToast('Đã xoá section', 'success');
            setDeletingSection(null);
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleToggleActive = async (section: HomepageSection) => {
        try {
            await updateMutation.mutateAsync({
                id: section.id,
                data: { isActive: !section.isActive },
            });
            showToast(section.isActive ? 'Đã tắt section' : 'Đã bật section', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleMoveUp = async (section: HomepageSection, index: number) => {
        if (!sections || index === 0) return;
        const prev = sections[index - 1];
        try {
            await reorderMutation.mutateAsync([
                { id: prev.id, order: section.order },
                { id: section.id, order: prev.order },
            ]);
        } catch { }
    };

    const handleMoveDown = async (section: HomepageSection, index: number) => {
        if (!sections || index === sections.length - 1) return;
        const next = sections[index + 1];
        try {
            await reorderMutation.mutateAsync([
                { id: next.id, order: section.order },
                { id: section.id, order: next.order },
            ]);
        } catch { }
    };

    const handleSeed = async () => {
        try {
            await seedMutation.mutateAsync();
            showToast('Đã seed dữ liệu mặc định', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const startEdit = (section: HomepageSection) => {
        setEditingSection(section);
        setIsCreating(false);
        setFormData({
            key: section.key,
            label: section.label,
            sortPath: section.sortPath,
            limit: section.limit,
            seeMorePath: section.seeMorePath || '/truyen',
            sortBy: section.sortBy || 'newest',
            isActive: section.isActive,
            order: section.order,
        });
    };

    const startCreate = () => {
        setIsCreating(true);
        setEditingSection(null);
        setFormData({ key: '', label: '', sortPath: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', isActive: true, order: (sections?.length || 0) });
    };

    const cancelEdit = () => {
        setIsCreating(false);
        setEditingSection(null);
    };

    if (isLoading) return <Loading />;

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                            Quản lý section trang chủ
                        </h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                            Tuỳ chỉnh các tab/bộ lọc hiển thị trên trang chủ
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshButton onRefresh={() => refetch()} />
                        <button
                            onClick={handleSeed}
                            disabled={seedMutation.isPending}
                            className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors text-sm disabled:opacity-50"
                        >
                            {seedMutation.isPending ? 'Đang seed...' : 'Seed mặc định'}
                        </button>
                        <button
                            onClick={startCreate}
                            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                        >
                            + Thêm section
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Tổng section</div>
                        <div className="text-2xl font-bold text-on-surface mt-1">{sections?.length || 0}</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Đang hoạt động</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">{sections?.filter(s => s.isActive).length || 0}</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Đang tắt</div>
                        <div className="text-2xl font-bold text-red-500 mt-1">{sections?.filter(s => !s.isActive).length || 0}</div>
                    </div>
                </div>

                {/* Create/Edit Form */}
                {(isCreating || editingSection) && (
                    <div className="bg-surface-container rounded-lg p-4 sm:p-6 border border-outline-variant">
                        <h2 className="text-lg sm:text-xl font-semibold text-on-surface mb-4">
                            {editingSection ? `Chỉnh sửa: ${editingSection.label}` : 'Thêm section mới'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Key <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.key}
                                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                    disabled={!!editingSection}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant disabled:opacity-50"
                                    placeholder="vd: newest, topRated..."
                                />
                                {editingSection && <p className="text-xs text-on-surface-variant mt-1">Key không thể thay đổi</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Label <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="Tên hiển thị trên chip"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Backend path <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.sortPath}
                                    onChange={(e) => setFormData({ ...formData, sortPath: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                >
                                    {SORT_PATH_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.value})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Số lượng truyện
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={formData.limit}
                                    onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) || 15 })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Link &quot;Xem tất cả&quot;
                                </label>
                                <input
                                    type="text"
                                    value={formData.seeMorePath}
                                    onChange={(e) => setFormData({ ...formData, seeMorePath: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="/truyen"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    SortBy (cho link Xem tất cả)
                                </label>
                                <select
                                    value={formData.sortBy || ''}
                                    onChange={(e) => setFormData({ ...formData, sortBy: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                >
                                    <option value="">Không đặt</option>
                                    {SORT_BY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Thứ tự hiển thị
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.order}
                                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded border-outline-variant text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-on-surface-variant">Đang hoạt động</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={editingSection ? handleUpdate : handleCreate}
                                disabled={createMutation.isPending || updateMutation.isPending || !formData.label.trim()}
                                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingSection ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                            <button onClick={cancelEdit} className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors">
                                Hủy
                            </button>
                        </div>
                    </div>
                )}

                {/* Sections List — Desktop table */}
                <div className="hidden sm:block bg-surface-container rounded-lg border border-outline-variant overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-container-low">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Key</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Label</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Path</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Limit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Trạng thái</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                                {(!sections || sections.length === 0) ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                                            Chưa có section nào. Nhấn &quot;Seed mặc định&quot; để tạo dữ liệu mẫu.
                                        </td>
                                    </tr>
                                ) : (
                                    sections.map((section, index) => (
                                        <tr key={section.id} className={`hover:bg-surface-container-high transition-colors ${!section.isActive ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleMoveUp(section, index)} disabled={index === 0} className="p-1 rounded hover:bg-surface-variant disabled:opacity-30" title="Di chuyển lên">↑</button>
                                                    <button onClick={() => handleMoveDown(section, index)} disabled={index === (sections?.length || 0) - 1} className="p-1 rounded hover:bg-surface-variant disabled:opacity-30" title="Di chuyển xuống">↓</button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><code className="text-xs bg-surface-container-high px-2 py-1 rounded">{section.key}</code></td>
                                            <td className="px-4 py-3"><span className="text-sm font-medium text-on-surface">{section.label}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm text-on-surface-variant">{section.sortPath}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm text-on-surface-variant">{section.limit}</span></td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => handleToggleActive(section)} className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${section.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {section.isActive ? 'Hoạt động' : 'Tắt'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => startEdit(section)} className="text-primary hover:text-blue-900 dark:hover:text-blue-300 text-sm">Sửa</button>
                                                    <button onClick={() => setDeletingSection(section)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-sm">Xóa</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sections List — Mobile cards */}
                <div className="sm:hidden space-y-3">
                    {(!sections || sections.length === 0) ? (
                        <div className="bg-surface-container rounded-lg border border-outline-variant p-8 text-center text-on-surface-variant">
                            Chưa có section nào. Nhấn &quot;Seed mặc định&quot; để tạo dữ liệu mẫu.
                        </div>
                    ) : (
                        sections.map((section, index) => (
                            <div key={section.id} className={`bg-surface-container rounded-lg border border-outline-variant p-4 ${!section.isActive ? 'opacity-50' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-on-surface">{section.label}</span>
                                            <code className="text-xs bg-surface-container-high px-2 py-0.5 rounded">{section.key}</code>
                                        </div>
                                        <div className="text-xs text-on-surface-variant mt-1">
                                            Path: {section.sortPath} · Limit: {section.limit}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => handleMoveUp(section, index)} disabled={index === 0} className="p-1.5 rounded hover:bg-surface-variant disabled:opacity-30 text-sm" title="Di chuyển lên">↑</button>
                                        <button onClick={() => handleMoveDown(section, index)} disabled={index === (sections?.length || 0) - 1} className="p-1.5 rounded hover:bg-surface-variant disabled:opacity-30 text-sm" title="Di chuyển xuống">↓</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/30">
                                    <button onClick={() => handleToggleActive(section)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${section.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {section.isActive ? 'Hoạt động' : 'Tắt'}
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => startEdit(section)} className="text-primary text-sm font-medium">Sửa</button>
                                        <button onClick={() => setDeletingSection(section)} className="text-red-600 dark:text-red-400 text-sm font-medium">Xóa</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {deletingSection && (
                <ConfirmModal
                    isOpen={!!deletingSection}
                    onClose={() => setDeletingSection(null)}
                    onConfirm={handleDelete}
                    title="Xác nhận xóa section"
                    message={`Bạn có chắc chắn muốn xóa section "${deletingSection.label}" (${deletingSection.key})? Hành động này không thể hoàn tác.`}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    confirmColor="red"
                />
            )}
        </>
    );
}
