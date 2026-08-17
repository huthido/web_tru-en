'use client';

import { useState, useCallback } from 'react';
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
    useSearchStoriesForSection,
    useAddStoryToSection,
    useRemoveStoryFromSection,
    useReorderSectionStories,
    HomepageSection,
    HomepageSectionStory,
} from '@/lib/api/hooks/use-homepage-sections';

const ALGORITHM_OPTIONS = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'best-of-month', label: 'Hay nhất tháng' },
    { value: 'best-of-week', label: 'Hay nhất tuần' },
    { value: 'top-rated', label: 'Đánh giá cao' },
    { value: 'recommended', label: 'Đề xuất' },
    { value: 'most-liked', label: 'Yêu thích' },
    { value: 'most-followed', label: 'Nhiều lượt theo dõi' },
    { value: 'most-viewed', label: 'Nhiều lượt xem' },
    { value: 'premium-stories', label: 'Truyện mất phí' },
    { value: 'random', label: 'Ngẫu nhiên' },
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
    const { showToast } = useToast();

    const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
    const [deletingSection, setDeletingSection] = useState<HomepageSection | null>(null);
    const [managingStories, setManagingStories] = useState<HomepageSection | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        key: '', label: '', algorithm: 'newest', sortPath: 'newest', limit: 15,
        seeMorePath: '/truyen', sortBy: 'newest', mode: 'auto' as 'auto' | 'manual',
        isActive: true, order: 0,
    });

    // ─── CRUD handlers ──────────────────────────────────────

    const handleCreate = async () => {
        if (!formData.key.trim() || !formData.label.trim()) {
            showToast('Vui lòng nhập key và label', 'error'); return;
        }
        try {
            await createMutation.mutateAsync(formData);
            showToast('Tạo section thành công', 'success');
            setIsCreating(false);
            resetForm();
        } catch (error: any) {
            showToast(error?.response?.data?.message || error?.response?.data?.error || 'Có lỗi', 'error');
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
            await updateMutation.mutateAsync({ id: section.id, data: { isActive: !section.isActive } });
            showToast(section.isActive ? 'Đã tắt section' : 'Đã bật section', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleToggleMode = async (section: HomepageSection) => {
        const newMode = section.mode === 'auto' ? 'manual' : 'auto';
        try {
            await updateMutation.mutateAsync({ id: section.id, data: { mode: newMode } });
            showToast(`Đã chuyển sang chế độ ${newMode === 'auto' ? 'Tự động' : 'Thủ công'}`, 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleMoveUp = async (section: HomepageSection, index: number) => {
        if (!sections || index === 0) return;
        const prev = sections[index - 1];
        try { await reorderMutation.mutateAsync([{ id: prev.id, order: section.order }, { id: section.id, order: prev.order }]); } catch { }
    };

    const handleMoveDown = async (section: HomepageSection, index: number) => {
        if (!sections || index === sections.length - 1) return;
        const next = sections[index + 1];
        try { await reorderMutation.mutateAsync([{ id: next.id, order: section.order }, { id: section.id, order: next.order }]); } catch { }
    };

    const handleSeed = async () => {
        try { await seedMutation.mutateAsync(); showToast('Đã seed dữ liệu mặc định', 'success'); }
        catch (error: any) { showToast(error?.response?.data?.message || 'Có lỗi', 'error'); }
    };

    const resetForm = () => setFormData({ key: '', label: '', algorithm: 'newest', sortPath: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', mode: 'auto', isActive: true, order: 0 });

    const startEdit = (section: HomepageSection) => {
        setEditingSection(section); setIsCreating(false);
        setFormData({
            key: section.key, label: section.label, algorithm: section.algorithm || 'newest', sortPath: section.sortPath,
            limit: section.limit, seeMorePath: section.seeMorePath || '/truyen',
            sortBy: section.sortBy || 'newest', mode: section.mode || 'auto',
            isActive: section.isActive, order: section.order,
        });
    };

    const startCreate = () => {
        setIsCreating(true); setEditingSection(null);
        setFormData({ key: '', label: '', algorithm: 'newest', sortPath: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', mode: 'auto', isActive: true, order: (sections?.length || 0) });
    };

    if (isLoading) return <Loading />;

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Quản lý section trang chủ</h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1">Tuỳ chỉnh các tab/bộ lọc hiển thị trên trang chủ</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshButton onRefresh={() => refetch()} />
                        <button onClick={handleSeed} disabled={seedMutation.isPending} className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors text-sm disabled:opacity-50">
                            {seedMutation.isPending ? 'Đang seed...' : 'Seed mặc định'}
                        </button>
                        <button onClick={startCreate} className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base">+ Thêm section</button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Tổng</div>
                        <div className="text-2xl font-bold text-on-surface mt-1">{sections?.length || 0}</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Hoạt động</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">{sections?.filter(s => s.isActive).length || 0}</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Tự động</div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">{sections?.filter(s => s.mode === 'auto').length || 0}</div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                        <div className="text-sm text-on-surface-variant">Thủ công</div>
                        <div className="text-2xl font-bold text-orange-600 mt-1">{sections?.filter(s => s.mode === 'manual').length || 0}</div>
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
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Key <span className="text-red-500">*</span></label>
                                <input type="text" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} disabled={!!editingSection}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant disabled:opacity-50"
                                    placeholder="vd: newest, topRated..." />
                                {editingSection && <p className="text-xs text-on-surface-variant mt-1">Key không thể thay đổi</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Label <span className="text-red-500">*</span></label>
                                <input type="text" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="Tên hiển thị trên chip" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Chế độ hiển thị</label>
                                <select value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'auto' | 'manual' })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface">
                                    <option value="auto">Tự động (theo thuật toán)</option>
                                    <option value="manual">Thủ công (chọn truyện)</option>
                                </select>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {formData.mode === 'auto' ? 'Truyện hiển thị theo thuật toán (mới nhất, rating cao...)' : 'Admin chọn truyện cụ thể hiển thị'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Thuật toán (chế độ tự động)</label>
                                {formData.mode === 'auto' ? (
                                    <select value={formData.algorithm} onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface">
                                        {ALGORITHM_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                    </select>
                                ) : (
                                    <input type="text" value="Chỉ dùng ở chế độ thủ công" disabled
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant opacity-50" />
                                )}
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {formData.mode === 'auto' ? 'Truyện hiển thị theo thuật toán đã chọn' : 'Chế độ thủ công không dùng thuật toán'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Số lượng truyện</label>
                                <input type="number" min={1} max={50} value={formData.limit} onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) || 15 })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Link &quot;Xem tất cả&quot;</label>
                                <input type="text" value={formData.seeMorePath} onChange={(e) => setFormData({ ...formData, seeMorePath: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="/truyen" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">SortBy (cho link Xem tất cả)</label>
                                <select value={formData.sortBy || ''} onChange={(e) => setFormData({ ...formData, sortBy: e.target.value })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface">
                                    <option value="">Không đặt</option>
                                    {SORT_BY_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">Thứ tự hiển thị</label>
                                <input type="number" min={0} value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface" />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded border-outline-variant text-primary focus:ring-primary" />
                                    <span className="text-sm font-medium text-on-surface-variant">Đang hoạt động</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={editingSection ? handleUpdate : handleCreate} disabled={createMutation.isPending || updateMutation.isPending || !formData.label.trim()}
                                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {editingSection ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                            <button onClick={() => { setIsCreating(false); setEditingSection(null); }}
                                className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors">Hủy</button>
                        </div>
                    </div>
                )}

                {/* Sections List — Desktop */}
                <div className="hidden sm:block bg-surface-container rounded-lg border border-outline-variant overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-surface-container-low">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Label</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Mode</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Truyện</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase">Trạng thái</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-on-surface-variant uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                                {!sections || sections.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">Chưa có section nào.</td></tr>
                                ) : sections.map((section, index) => (
                                    <tr key={section.id} className={`hover:bg-surface-container-high transition-colors ${!section.isActive ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleMoveUp(section, index)} disabled={index === 0} className="p-1 rounded hover:bg-surface-variant disabled:opacity-30" title="Lên">↑</button>
                                                <button onClick={() => handleMoveDown(section, index)} disabled={index === sections.length - 1} className="p-1 rounded hover:bg-surface-variant disabled:opacity-30" title="Xuống">↓</button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="text-sm font-medium text-on-surface">{section.label}</span>
                                                <code className="ml-2 text-xs bg-surface-container-high px-1.5 py-0.5 rounded">{section.key}</code>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleMode(section)}
                                                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${section.mode === 'auto' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                {section.mode === 'auto' ? '⚡ Tự động' : '✋ Thủ công'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            {section.mode === 'manual' ? (
                                                <button onClick={() => setManagingStories(section)} className="text-sm text-primary hover:underline">
                                                    {section.stories?.length || 0} truyện — Quản lý
                                                </button>
                                            ) : (
                                                <span className="text-sm text-on-surface-variant">Tự động</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleActive(section)}
                                                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${section.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sections List — Mobile */}
                <div className="sm:hidden space-y-3">
                    {!sections || sections.length === 0 ? (
                        <div className="bg-surface-container rounded-lg border border-outline-variant p-8 text-center text-on-surface-variant">Chưa có section nào.</div>
                    ) : sections.map((section, index) => (
                        <div key={section.id} className={`bg-surface-container rounded-lg border border-outline-variant p-4 ${!section.isActive ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-on-surface">{section.label}</span>
                                        <code className="text-xs bg-surface-container-high px-2 py-0.5 rounded">{section.key}</code>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <button onClick={() => handleToggleMode(section)}
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${section.mode === 'auto' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {section.mode === 'auto' ? '⚡ Tự động' : '✋ Thủ công'}
                                        </button>
                                        {section.mode === 'manual' && (
                                            <button onClick={() => setManagingStories(section)} className="text-xs text-primary hover:underline">
                                                {section.stories?.length || 0} truyện
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => handleMoveUp(section, index)} disabled={index === 0} className="p-1.5 rounded hover:bg-surface-variant disabled:opacity-30 text-sm">↑</button>
                                    <button onClick={() => handleMoveDown(section, index)} disabled={index === sections.length - 1} className="p-1.5 rounded hover:bg-surface-variant disabled:opacity-30 text-sm">↓</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/30">
                                <button onClick={() => handleToggleActive(section)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${section.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {section.isActive ? 'Hoạt động' : 'Tắt'}
                                </button>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => startEdit(section)} className="text-primary text-sm font-medium">Sửa</button>
                                    <button onClick={() => setDeletingSection(section)} className="text-red-600 dark:text-red-400 text-sm font-medium">Xóa</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Manual Stories Manager Modal */}
            {managingStories && (
                <ManualStoriesManager section={managingStories} onClose={() => setManagingStories(null)} />
            )}

            {/* Delete Confirmation */}
            {deletingSection && (
                <ConfirmModal isOpen onClose={() => setDeletingSection(null)} onConfirm={handleDelete}
                    title="Xác nhận xóa section" message={`Xoá section "${deletingSection.label}"?`}
                    confirmText="Xóa" cancelText="Hủy" confirmColor="red" />
            )}
        </>
    );
}

// ─── Manual Stories Manager ──────────────────────────────────

function ManualStoriesManager({ section, onClose }: { section: HomepageSection; onClose: () => void }) {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: searchResults = [] } = useSearchStoriesForSection(section.id, searchQuery);
    const addMutation = useAddStoryToSection();
    const removeMutation = useRemoveStoryFromSection();
    const reorderMutation = useReorderSectionStories();
    const { showToast } = useToast();

    const sectionStories = section.stories || [];

    const handleAdd = useCallback(async (storyId: string) => {
        try {
            await addMutation.mutateAsync({ sectionId: section.id, storyId });
            showToast('Đã thêm truyện', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi', 'error');
        }
    }, [addMutation, section.id, showToast]);

    const handleRemove = useCallback(async (storyId: string) => {
        try {
            await removeMutation.mutateAsync({ sectionId: section.id, storyId });
            showToast('Đã xoá truyện', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.message || 'Có lỗi', 'error');
        }
    }, [removeMutation, section.id, showToast]);

    const handleMoveStory = useCallback(async (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= sectionStories.length) return;
        const items = sectionStories.map((s, i) => {
            if (i === index) return { id: s.id, order: sectionStories[newIndex].order };
            if (i === newIndex) return { id: s.id, order: sectionStories[index].order };
            return { id: s.id, order: s.order };
        });
        try { await reorderMutation.mutateAsync({ sectionId: section.id, items }); } catch { }
    }, [sectionStories, section.id, reorderMutation]);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-on-surface">{section.label}</h3>
                        <p className="text-sm text-on-surface-variant">Quản lý truyện thủ công ({sectionStories.length} truyện)</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant">✕</button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-outline-variant/50 shrink-0">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm truyện để thêm (tên, slug)..."
                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant text-sm" />
                    {searchResults.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {searchResults.map((story: any) => {
                                const alreadyAdded = sectionStories.some((s) => s.storyId === story.id);
                                return (
                                    <div key={story.id} className="flex items-center justify-between p-2 rounded hover:bg-surface-container-high">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {story.coverImage && <img src={story.coverImage} alt="" className="w-8 h-10 object-cover rounded" />}
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-on-surface truncate">{story.title}</div>
                                                <div className="text-xs text-on-surface-variant">{story.authorName || story.author?.username || 'N/A'} · {story.viewCount} views</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleAdd(story.id)} disabled={alreadyAdded || addMutation.isPending}
                                            className={`px-3 py-1 rounded text-xs font-medium shrink-0 ml-2 ${alreadyAdded ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-on-primary hover:bg-blue-700'}`}>
                                            {alreadyAdded ? 'Đã có' : '+ Thêm'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Current stories list */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {sectionStories.length === 0 ? (
                        <div className="text-center py-8 text-on-surface-variant text-sm">
                            Chưa có truyện nào. Sử dụng ô tìm kiếm ở trên để thêm truyện.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sectionStories.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant/50">
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => handleMoveStory(index, -1)} disabled={index === 0}
                                            className="p-1 rounded hover:bg-surface-variant disabled:opacity-30 text-xs">↑</button>
                                        <button onClick={() => handleMoveStory(index, 1)} disabled={index === sectionStories.length - 1}
                                            className="p-1 rounded hover:bg-surface-variant disabled:opacity-30 text-xs">↓</button>
                                    </div>
                                    {item.story.coverImage && <img src={item.story.coverImage} alt="" className="w-10 h-12 object-cover rounded shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-on-surface truncate">{item.story.title}</div>
                                        <div className="text-xs text-on-surface-variant">{item.story.authorName || 'N/A'} · {item.story.viewCount} views · ★ {item.story.rating}</div>
                                    </div>
                                    <button onClick={() => handleRemove(item.storyId)} disabled={removeMutation.isPending}
                                        className="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 text-xs font-medium shrink-0">Xoá</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-outline-variant shrink-0">
                    <button onClick={onClose} className="w-full px-4 py-2 bg-surface-container-high rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors">Đóng</button>
                </div>
            </div>
        </div>
    );
}
