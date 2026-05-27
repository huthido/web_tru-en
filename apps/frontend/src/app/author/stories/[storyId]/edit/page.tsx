'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { useStory, useUpdateStory } from '@/lib/api/hooks/use-stories';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { UserRole } from '@shared/types';
import { Loading } from '@/components/ui/loading';
import { storiesService } from '@/lib/api/stories.service';
import { useToastContext } from '@/components/providers/toast-provider';
import { compressImageToTarget, COMPRESS_TARGET, MAX_INPUT_BYTES, isImageFile } from '@/lib/utils/compress-image';
import { MonetizationLockedNotice, useMonetizationLocked } from '@/components/author/monetization-locked-notice';
import { AdRevenueToggle } from '@/components/author/ad-revenue-toggle';

export default function EditStoryPage() {
    const params = useParams();
    const router = useRouter();
    const storyId = params.storyId as string;
    // Try to get story by ID first, if not found, try by slug
    const { data: story, isLoading: storyLoading } = useStory(storyId);
    const { data: categoriesResponse } = useCategories();
    const categories = Array.isArray(categoriesResponse) ? categoriesResponse : [];
    const updateMutation = useUpdateStory();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToastContext();
    const monetizationLocked = useMonetizationLocked();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        coverImage: '',
        categoryIds: [] as string[],
        country: 'VN',
        status: 'DRAFT' as 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED',
        accessType: 'FREE' as 'FREE' | 'FREEMIUM' | 'VIP',
        price: 0,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (story) {
            // Handle both ApiResponse format and direct Story object
            const storyData = (story as any)?.data || story;
            setFormData({
                title: storyData.title || '',
                description: storyData.description || '',
                coverImage: storyData.coverImage || '',
                categoryIds:
                    storyData.storyCategories?.map((sc: any) => sc.category?.id || sc.categoryId) || [],
                country: storyData.country || 'VN',
                status: storyData.status || 'DRAFT',
                accessType: storyData.accessType || 'FREE',
                price: storyData.price ?? 0,
            });
        }
    }, [story]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type — accept cả .heic/.heif không có MIME (Chrome desktop).
        if (!isImageFile(file)) {
            setErrors({ coverImage: 'Chỉ chấp nhận file ảnh' });
            return;
        }

        // Cho phép input tới 50MB — client sẽ nén xuống <= 2MB trước upload.
        if (file.size > MAX_INPUT_BYTES) {
            setErrors({ coverImage: 'Kích thước file không được vượt quá 50MB' });
            return;
        }

        setUploading(true);
        setErrors({});

        try {
            const compressedFile = await compressImageToTarget(
                file,
                { maxWidth: 1200, maxHeight: 1200, quality: 0.85 },
                COMPRESS_TARGET.cover,
            );

            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('folder', 'stories');

            const response = await storiesService.uploadCover(compressedFile);
            const imageUrl = (response as any)?.data?.coverImage || (response as any)?.coverImage || '';

            setFormData((prev) => ({ ...prev, coverImage: imageUrl }));
            setErrors({});
        } catch (error: any) {
            setErrors({
                coverImage: error?.response?.data?.error || 'Có lỗi xảy ra khi upload ảnh',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!formData.title.trim()) {
            setErrors({ title: 'Vui lòng nhập tiêu đề truyện' });
            return;
        }

        try {
            await updateMutation.mutateAsync({
                id: storyId,
                data: {
                    title: formData.title,
                    description: formData.description,
                    coverImage: formData.coverImage,
                    categoryIds: formData.categoryIds,
                    country: formData.country,
                    status: formData.status,
                    accessType: formData.accessType,
                    price: formData.accessType === 'VIP' ? Math.max(0, Math.floor(formData.price) || 0) : 0,
                },
            });

            showToast('Cập nhật truyện thành công!', 'success');
            router.push(`/author/stories/${storyId}/chapters`);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.error || 'Có lỗi xảy ra khi cập nhật truyện';
            setErrors({
                submit: errorMessage,
            });
            showToast(errorMessage, 'error');
        }
    };

    if (storyLoading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                    <Loading />
                </div>
            </ProtectedRoute>
        );
    }

    if (!story) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-on-surface mb-2">
                            Không tìm thấy truyện
                        </h1>
                        <p className="text-on-surface-variant">
                            Truyện bạn đang tìm không tồn tại hoặc bạn không có quyền truy cập.
                        </p>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-surface transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-60 pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6">
                                <h1 className="text-3xl font-bold text-on-surface mb-2">
                                    Chỉnh sửa truyện
                                </h1>
                                <p className="text-on-surface-variant">
                                    Cập nhật thông tin truyện của bạn
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Tiêu đề truyện <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                        placeholder="Nhập tiêu đề truyện"
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        rows={6}
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                        placeholder="Nhập mô tả truyện"
                                    />
                                </div>

                                {/* Cover Image */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Ảnh bìa
                                    </label>
                                    <div className="space-y-4">
                                        {formData.coverImage && (
                                            <div className="relative w-full h-80 rounded-lg overflow-hidden border border-outline-variant bg-surface-variant">
                                                <img
                                                    src={formData.coverImage}
                                                    alt="Cover"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,.heic,.heif"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploading ? 'Đang upload...' : 'Chọn ảnh bìa'}
                                        </button>
                                        {errors.coverImage && (
                                            <p className="text-sm text-red-600 dark:text-red-400">
                                                {errors.coverImage}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Categories */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Thể loại
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {categories.map((category) => (
                                            <label
                                                key={category.id}
                                                className="flex items-center space-x-2 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.categoryIds.includes(category.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                categoryIds: [...formData.categoryIds, category.id],
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                categoryIds: formData.categoryIds.filter(
                                                                    (id) => id !== category.id
                                                                ),
                                                            });
                                                        }
                                                    }}
                                                    className="rounded border-outline-variant text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm text-on-surface-variant">
                                                    {category.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Quốc gia
                                    </label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) =>
                                            setFormData({ ...formData, country: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    >
                                        <option value="VN">Việt Nam</option>
                                        <option value="CN">Trung Quốc</option>
                                        <option value="KR">Hàn Quốc</option>
                                        <option value="JP">Nhật Bản</option>
                                        <option value="US">Mỹ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                status: e.target.value as 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED',
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    >
                                        <option value="DRAFT">Bản nháp</option>
                                        <option value="ONGOING">Đang ra</option>
                                        <option value="COMPLETED">Hoàn thành</option>
                                        <option value="PUBLISHED">Đã xuất bản</option>
                                        <option value="ARCHIVED">Lưu trữ</option>
                                    </select>
                                </div>

                                {/* Access type (spec mục 4) */}
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                        Hình thức truyện
                                    </label>
                                    <select
                                        value={formData.accessType}
                                        onChange={(e) => {
                                            const next = e.target.value as 'FREE' | 'FREEMIUM' | 'VIP';
                                            if (monetizationLocked && next !== 'FREE') {
                                                setFormData({ ...formData, accessType: 'FREE', price: 0 });
                                                return;
                                            }
                                            setFormData({ ...formData, accessType: next });
                                        }}
                                        className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    >
                                        <option value="FREE">Miễn phí — ai cũng đọc được</option>
                                        <option value="FREEMIUM" disabled={monetizationLocked}>Freemium — đặt giá coin từng chương</option>
                                        <option value="VIP" disabled={monetizationLocked}>VIP — mua một lần mở khóa cả truyện</option>
                                    </select>
                                    <p className="mt-2 text-xs text-on-surface-variant">
                                        FREEMIUM: vào từng chương để đặt giá; nhãn trả phí được ẩn với độc giả.
                                    </p>
                                    <MonetizationLockedNotice feature="vip-story" />
                                </div>

                                {formData.accessType === 'VIP' && (
                                    <div>
                                        <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                            Giá mở khóa cả truyện (coin)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={formData.price}
                                            disabled={monetizationLocked}
                                            onChange={(e) => setFormData({ ...formData, price: Math.max(0, Math.floor(Number(e.target.value)) || 0) })}
                                            className="w-full md:w-48 px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="0"
                                        />
                                        <p className="mt-2 text-xs text-on-surface-variant">
                                            Độc giả trả số coin này để đọc toàn bộ chương. Bạn nhận phần còn lại sau phí nền tảng.
                                        </p>
                                    </div>
                                )}

                                {/* Ad revenue toggle (Phase B2.1) */}
                                {story && (
                                    <AdRevenueToggle
                                        storyId={(story as any)?.data?.id ?? (story as any)?.id}
                                        initialEnabled={
                                            !!((story as any)?.data?.adRevenueEnabled ?? (story as any)?.adRevenueEnabled)
                                        }
                                    />
                                )}

                                {/* Error Message */}
                                {errors.submit && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={updateMutation.isPending}
                                        className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="px-6 py-3 bg-surface-variant text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </main>
                </div>
                <Footer />
            </div>
        </ProtectedRoute>
    );
}

