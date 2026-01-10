'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useMyStories, useDeleteStory, usePublishStory } from '@/lib/api/hooks/use-stories';
import { useCreateApprovalRequest } from '@/lib/api/hooks/use-approvals';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { UserRole } from '@shared/types';
import { Story } from '@/lib/api/stories.service';
import { useToastContext } from '@/components/providers/toast-provider';
import { BookOpen, Eye, Star, Edit, Trash2, Send, LayoutGrid, List } from 'lucide-react';

export default function AuthorDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string>('');
    const { data, isLoading, error } = useMyStories({ 
        page, 
        limit: 10,
        search: search || undefined,
        status: status || undefined,
    });
    const deleteMutation = useDeleteStory();
    const publishMutation = usePublishStory();
    const createApprovalMutation = useCreateApprovalRequest();
    const { showToast } = useToastContext();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; storyId: string; storyTitle: string }>({
        isOpen: false,
        storyId: '',
        storyTitle: '',
    });

    const stories: Story[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    const meta = data?.meta;

    const handleDelete = (id: string, title: string) => {
        setDeleteModal({ isOpen: true, storyId: id, storyTitle: title });
    };

    const confirmDelete = async () => {
        try {
            await deleteMutation.mutateAsync(deleteModal.storyId);
            setDeleteModal({ isOpen: false, storyId: '', storyTitle: '' });
            showToast('Đã xóa truyện thành công', 'success');
        } catch (error) {
            console.error('Error deleting story:', error);
            showToast('Có lỗi xảy ra khi xóa truyện', 'error');
        }
    };

    const handlePublish = async (id: string, title: string, hasChapters: boolean) => {
        try {
            // Check if user is ADMIN
            if (user?.role === UserRole.ADMIN) {
                // Admin can publish directly
                await publishMutation.mutateAsync(id);
                showToast('Đã xuất bản truyện thành công', 'success');
            } else {
                // USER/AUTHOR must request approval
                if (!hasChapters) {
                    showToast('Truyện phải có ít nhất 1 chương trước khi gửi yêu cầu xuất bản', 'error');
                    return;
                }
                
                await createApprovalMutation.mutateAsync({
                    storyId: id,
                    type: 'STORY_PUBLISH',
                    message: `Yêu cầu xuất bản truyện: ${title}`,
                });
                showToast('Đã gửi yêu cầu xuất bản. Vui lòng đợi admin duyệt.', 'success');
            }
        } catch (error: any) {
            const errorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Có lỗi xảy ra';
            showToast(errorMessage, 'error');
        }
    };

    if (!isAuthenticated) {
        return <ProtectedRoute><div /></ProtectedRoute>;
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-[120px] pb-16 md:pb-0">
                <Header />
                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        Quản lý truyện của tôi
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Tổng số: {meta?.total || 0} truyện
                                    </p>
                                </div>
                                <Link
                                    href="/author/stories/create"
                                    className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Tạo truyện mới
                                </Link>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Tổng truyện</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{meta?.total || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Send className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Đã xuất bản</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {stories.filter(s => s.isPublished).length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Lượt xem</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {stories.reduce((sum, s) => sum + s.viewCount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Star className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Đánh giá TB</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {stories.length > 0 
                                                ? (stories.reduce((sum, s) => sum + s.rating, 0) / stories.length).toFixed(1)
                                                : '0.0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters & View Toggle */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tìm kiếm
                                    </label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Tìm theo tiêu đề, mô tả..."
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                {/* Status Filter */}
                                <div className="md:w-48">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            setStatus(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="DRAFT">Bản nháp</option>
                                        <option value="ONGOING">Đang ra</option>
                                        <option value="COMPLETED">Đã hoàn thành</option>
                                        <option value="PUBLISHED">Đã xuất bản</option>
                                        <option value="ARCHIVED">Đã lưu trữ</option>
                                    </select>
                                </div>
                                {/* View Mode Toggle */}
                                <div className="md:w-auto">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Hiển thị
                                    </label>
                                    <div className="flex gap-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`px-4 py-2 transition-colors ${
                                                viewMode === 'grid'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            <LayoutGrid className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`px-4 py-2 transition-colors ${
                                                viewMode === 'list'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            <List className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stories List */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loading />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-500 dark:text-red-400">Có lỗi xảy ra khi tải danh sách truyện</p>
                            </div>
                        ) : stories.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Bạn chưa có truyện nào</p>
                                <Link
                                    href="/author/stories/create"
                                    className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Tạo truyện đầu tiên
                                </Link>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {stories.map((story) => (
                                            <div
                                                key={story.id}
                                                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 dark:border-gray-700"
                                            >
                                                {/* Cover Image */}
                                                <Link href={`/truyen/${story.slug}`} className="block relative h-56 overflow-hidden bg-gray-100 dark:bg-gray-700">
                                                    {story.coverImage ? (
                                                        <img
                                                            src={story.coverImage}
                                                            alt={story.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <BookOpen className="w-12 h-12 text-gray-400" />
                                                        </div>
                                                    )}
                                                    {/* Status Badge */}
                                                    <div className="absolute top-2 right-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            !story.isPublished
                                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                                                : story.status === 'ONGOING'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                                                : story.status === 'COMPLETED'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                                : story.status === 'ARCHIVED'
                                                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                        }`}>
                                                            {!story.isPublished
                                                                ? 'Nháp'
                                                                : story.status === 'ONGOING'
                                                                ? 'Đang ra'
                                                                : story.status === 'COMPLETED'
                                                                ? 'Hoàn thành'
                                                                : story.status === 'ARCHIVED'
                                                                ? 'Lưu trữ'
                                                                : 'Xuất bản'}
                                                        </span>
                                                    </div>
                                                </Link>

                                                {/* Content */}
                                                <div className="p-4">
                                                    <Link href={`/truyen/${story.slug}`}>
                                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                            {story.title}
                                                        </h3>
                                                    </Link>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                                        {story.description || 'Chưa có mô tả'}
                                                    </p>

                                                    {/* Stats */}
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                        <div className="flex items-center gap-1">
                                                            <Eye className="w-4 h-4" />
                                                            <span>{story.viewCount.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-4 h-4" />
                                                            <span>{story.rating.toFixed(1)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen className="w-4 h-4" />
                                                            <span>{story._count?.chapters || 0}</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Link
                                                                href={`/author/stories/${story.slug}/chapters`}
                                                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors text-center flex items-center justify-center gap-1"
                                                            >
                                                                <BookOpen className="w-4 h-4" />
                                                                Chương
                                                            </Link>
                                                            <Link
                                                                href={`/author/stories/${story.id}/edit`}
                                                                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors text-center flex items-center justify-center gap-1"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Sửa
                                                            </Link>
                                                        </div>
                                                        {!story.isPublished && (
                                                            <button
                                                                onClick={() => handlePublish(story.id, story.title, (story._count?.chapters || 0) > 0)}
                                                                disabled={publishMutation.isPending || createApprovalMutation.isPending}
                                                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                {(publishMutation.isPending || createApprovalMutation.isPending) 
                                                                    ? 'Đang xử lý...' 
                                                                    : user?.role === UserRole.ADMIN 
                                                                    ? 'Xuất bản' 
                                                                    : 'Gửi duyệt'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(story.id, story.title)}
                                                            disabled={deleteMutation.isPending}
                                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {stories.map((story) => (
                                            <div
                                                key={story.id}
                                                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    {/* Cover Image */}
                                                    <Link
                                                        href={`/truyen/${story.slug}`}
                                                        className="flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                                                    >
                                                        {story.coverImage ? (
                                                            <img
                                                                src={story.coverImage}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <BookOpen className="w-10 h-10 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </Link>

                                                    {/* Story Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <Link href={`/truyen/${story.slug}`}>
                                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                                                                    {story.title}
                                                                </h3>
                                                            </Link>
                                                            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                                                !story.isPublished
                                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                                                    : story.status === 'ONGOING'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                                                    : story.status === 'COMPLETED'
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                                    : story.status === 'ARCHIVED'
                                                                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                            }`}>
                                                                {!story.isPublished
                                                                    ? 'Nháp'
                                                                    : story.status === 'ONGOING'
                                                                    ? 'Đang ra'
                                                                    : story.status === 'COMPLETED'
                                                                    ? 'Hoàn thành'
                                                                    : story.status === 'ARCHIVED'
                                                                    ? 'Lưu trữ'
                                                                    : 'Xuất bản'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                                            {story.description || 'Chưa có mô tả'}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="w-4 h-4" />
                                                                <span>{story.viewCount.toLocaleString()}</span>
                                                            </div>
                                                            <span>•</span>
                                                            <div className="flex items-center gap-1">
                                                                <Star className="w-4 h-4" />
                                                                <span>{story.rating.toFixed(1)} ({story.ratingCount})</span>
                                                            </div>
                                                            <span>•</span>
                                                            <div className="flex items-center gap-1">
                                                                <BookOpen className="w-4 h-4" />
                                                                <span>{story._count?.chapters || 0} chương</span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex flex-wrap gap-2">
                                                            <Link
                                                                href={`/author/stories/${story.slug}/chapters`}
                                                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                                                            >
                                                                <BookOpen className="w-4 h-4" />
                                                                Quản lý chương
                                                            </Link>
                                                            <Link
                                                                href={`/author/stories/${story.id}/edit`}
                                                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Chỉnh sửa
                                                            </Link>
                                                            {!story.isPublished && (
                                                                <button
                                                                    onClick={() => handlePublish(story.id, story.title, (story._count?.chapters || 0) > 0)}
                                                                    disabled={publishMutation.isPending || createApprovalMutation.isPending}
                                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                    {(publishMutation.isPending || createApprovalMutation.isPending) 
                                                                        ? 'Đang xử lý...' 
                                                                        : user?.role === UserRole.ADMIN 
                                                                        ? 'Xuất bản' 
                                                                        : 'Gửi duyệt'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(story.id, story.title)}
                                                                disabled={deleteMutation.isPending}
                                                                className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Pagination */}
                                {meta && meta.totalPages > 1 && (
                                    <div className="mt-6 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Trước
                                        </button>
                                        <span className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                                            Trang {page} / {meta.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(page + 1)}
                                            disabled={page >= meta.totalPages}
                                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
                <Footer />
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, storyId: '', storyTitle: '' })}
                onConfirm={confirmDelete}
                title="Xác nhận xóa truyện"
                message={`Bạn có chắc chắn muốn xóa truyện "${deleteModal.storyTitle}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmColor="red"
                isLoading={deleteMutation.isPending}
            />
        </div>
        </ProtectedRoute>
    );
}

