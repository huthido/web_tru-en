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
import { useCreateApprovalRequest, useMyApprovals } from '@/lib/api/hooks/use-approvals';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { UserRole } from '@shared/types';
import { Story } from '@/lib/api/stories.service';
import { useToastContext } from '@/components/providers/toast-provider';
import { BookOpen, Eye, Star, Edit, Trash2, Send, LayoutGrid, List } from 'lucide-react';
import { DonationEarningsCard } from '@/components/author/donation-earnings-card';
import { ChapterSalesEarningsCard } from '@/components/author/chapter-sales-card';
import { StorySalesEarningsCard } from '@/components/author/story-sales-card';
import { TodayEarningsCard } from '@/components/author/today-earnings-card';

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

    // Get approval requests to check story approval status
    const { data: approvalsResponse } = useMyApprovals({ limit: 1000 });
    const approvals = approvalsResponse?.data || [];

    const stories: Story[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    const meta = data?.meta;

    // Helper function to check if story has pending approval
    const getStoryApprovalStatus = (storyId: string) => {
        return approvals.find((approval: any) => 
            approval.storyId === storyId && 
            approval.type === 'STORY_PUBLISH' &&
            approval.status === 'PENDING'
        );
    };

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
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-[120px] pb-16 md:pb-0">
                <Header />
                <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="bg-surface-container rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-outline-variant">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
                                        Quản lý truyện của tôi
                                    </h1>
                                    <p className="text-on-surface-variant">
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
                                <Link
                                    href="/author/withdrawals"
                                    className="mt-4 md:mt-0 md:ml-3 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
                                >
                                    Rút xu
                                </Link>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-surface-container rounded-lg p-4 shadow-sm border border-outline-variant">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-on-surface-variant" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-on-surface-variant">Tổng truyện</p>
                                        <p className="text-xl font-bold text-on-surface">{meta?.total || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface-container rounded-lg p-4 shadow-sm border border-outline-variant">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Send className="w-5 h-5 text-on-surface-variant" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-on-surface-variant">Đã xuất bản</p>
                                        <p className="text-xl font-bold text-on-surface">
                                            {stories.filter(s => s.isPublished).length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface-container rounded-lg p-4 shadow-sm border border-outline-variant">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Eye className="w-5 h-5 text-on-surface-variant" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-on-surface-variant">Lượt xem</p>
                                        <p className="text-xl font-bold text-on-surface">
                                            {stories.reduce((sum, s) => sum + s.viewCount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface-container rounded-lg p-4 shadow-sm border border-outline-variant">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Star className="w-5 h-5 text-on-surface-variant" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-on-surface-variant">Đánh giá TB</p>
                                        <p className="text-xl font-bold text-on-surface">
                                            {stories.length > 0 
                                                ? (stories.reduce((sum, s) => sum + s.rating, 0) / stories.length).toFixed(1)
                                                : '0.0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Today's revenue across all sources */}
                        <TodayEarningsCard />

                        {/* Donation earnings — author-only revenue breakdown */}
                        <DonationEarningsCard />

                        {/* Chapter-sales earnings — author-only revenue breakdown */}
                        <ChapterSalesEarningsCard />

                        {/* VIP story-sales earnings — author-only revenue breakdown */}
                        <StorySalesEarningsCard />

                        {/* Filters & View Toggle */}
                        <div className="bg-surface-container rounded-lg shadow-sm p-4 mb-6 border border-outline-variant">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Search */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
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
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                {/* Status Filter */}
                                <div className="md:w-48">
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            setStatus(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Hiển thị
                                    </label>
                                    <div className="flex gap-1 border border-outline-variant rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`px-4 py-2 transition-colors ${
                                                viewMode === 'grid'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
                                            }`}
                                        >
                                            <LayoutGrid className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`px-4 py-2 transition-colors ${
                                                viewMode === 'list'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low'
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
                            <div className="text-center py-12 bg-surface-container rounded-lg">
                                <p className="text-on-surface-variant mb-4">Bạn chưa có truyện nào</p>
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
                                                className="bg-surface-container rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-outline-variant flex flex-col h-full"
                                            >
                                                {/* Cover Image */}
                                                <Link href={`/truyen/${story.slug}`} className="block relative h-56 overflow-hidden bg-surface-container-high">
                                                    {story.coverImage ? (
                                                        <img
                                                            src={story.coverImage}
                                                            alt={story.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <BookOpen className="w-12 h-12 text-on-surface-variant" />
                                                        </div>
                                                    )}
                                                    {/* Status Badge */}
                                                    <div className="absolute top-2 right-2">
                                                        {(() => {
                                                            const pendingApproval = getStoryApprovalStatus(story.id);
                                                            const statusClass = pendingApproval
                                                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                                                                : !story.isPublished
                                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                                                : story.status === 'ONGOING'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                                                : story.status === 'COMPLETED'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                                : story.status === 'ARCHIVED'
                                                                ? 'bg-surface-container-high text-on-surface/50'
                                                                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
                                                            const statusText = pendingApproval
                                                                ? 'Đang chờ phê duyệt'
                                                                : !story.isPublished
                                                                ? 'Nháp'
                                                                : story.status === 'ONGOING'
                                                                ? 'Đang ra'
                                                                : story.status === 'COMPLETED'
                                                                ? 'Hoàn thành'
                                                                : story.status === 'ARCHIVED'
                                                                ? 'Lưu trữ'
                                                                : 'Xuất bản';
                                                            return (
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}>
                                                                    {statusText}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </Link>

                                                {/* Content */}
                                                <div className="p-4 flex flex-col flex-1">
                                                    <Link href={`/truyen/${story.slug}`}>
                                                        <h3 className="text-base font-semibold text-on-surface mb-2 line-clamp-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                            {story.title}
                                                        </h3>
                                                    </Link>
                                                    <p className="text-sm text-on-surface-variant mb-3 line-clamp-1 flex-1">
                                                        {story.description || 'Chưa có mô tả'}
                                                    </p>

                                                    {/* Stats */}
                                                    <div className="flex items-center gap-3 text-xs text-on-surface-variant mb-3">
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
                                                                className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-xs font-medium transition-colors text-center flex items-center justify-center gap-1"
                                                            >
                                                                <BookOpen className="w-4 h-4" />
                                                                Chương
                                                            </Link>
                                                            <Link
                                                                href={`/author/stories/${story.id}/edit`}
                                                                className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-xs font-medium transition-colors text-center flex items-center justify-center gap-1"
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
                                                            className="w-full px-3 py-2 bg-surface-container hover:bg-surface-container-high text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
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
                                                className="bg-surface-container rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-outline-variant"
                                            >
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    {/* Cover Image */}
                                                    <Link
                                                        href={`/truyen/${story.slug}`}
                                                        className="flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden bg-surface-container-high"
                                                    >
                                                        {story.coverImage ? (
                                                            <img
                                                                src={story.coverImage}
                                                                alt={story.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <BookOpen className="w-10 h-10 text-on-surface-variant" />
                                                            </div>
                                                        )}
                                                    </Link>

                                                    {/* Story Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <Link href={`/truyen/${story.slug}`}>
                                                                <h3 className="text-base font-semibold text-on-surface hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2">
                                                                    {story.title}
                                                                </h3>
                                                            </Link>
                                                            {(() => {
                                                                const pendingApproval = getStoryApprovalStatus(story.id);
                                                                const statusClass = pendingApproval
                                                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                                                                    : !story.isPublished
                                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                                                                    : story.status === 'ONGOING'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                                                                    : story.status === 'COMPLETED'
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                                    : story.status === 'ARCHIVED'
                                                                    ? 'bg-surface-container-high text-on-surface/50'
                                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
                                                                const statusText = pendingApproval
                                                                    ? 'Đang chờ phê duyệt'
                                                                    : !story.isPublished
                                                                    ? 'Nháp'
                                                                    : story.status === 'ONGOING'
                                                                    ? 'Đang ra'
                                                                    : story.status === 'COMPLETED'
                                                                    ? 'Hoàn thành'
                                                                    : story.status === 'ARCHIVED'
                                                                    ? 'Lưu trữ'
                                                                    : 'Xuất bản';
                                                                return (
                                                                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusClass}`}>
                                                                        {statusText}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">
                                                            {story.description || 'Chưa có mô tả'}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mb-3">
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
                                                                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                                                            >
                                                                <BookOpen className="w-4 h-4" />
                                                                Quản lý chương
                                                            </Link>
                                                            <Link
                                                                href={`/author/stories/${story.id}/edit`}
                                                                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
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
                                                                className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
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
                                            className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Trước
                                        </button>
                                        <span className="px-4 py-2 text-on-surface-variant font-medium">
                                            Trang {page} / {meta.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(page + 1)}
                                            disabled={page >= meta.totalPages}
                                            className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

