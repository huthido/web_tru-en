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
import { compressImage } from '@/lib/utils/compress-image';

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

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        coverImage: '',
        categoryIds: [] as string[],
        country: 'VN',
        status: 'DRAFT' as 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED',
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
            });
        }
    }, [story]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setErrors({ coverImage: 'Chỉ chấp nhận file ảnh' });
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setErrors({ coverImage: 'Kích thước file không được vượt quá 10MB' });
            return;
        }

        setUploading(true);
        setErrors({});

        try {
            // Compress image before upload
            const compressedFile = await compressImage(file, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.85,
            });

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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Không tìm thấy truyện
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Truyện bạn đang tìm không tồn tại hoặc bạn không có quyền truy cập.
                        </p>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-[120px] pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    Chỉnh sửa truyện
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Cập nhật thông tin truyện của bạn
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tiêu đề truyện <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        rows={6}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                        placeholder="Nhập mô tả truyện"
                                    />
                                </div>

                                {/* Cover Image */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ảnh bìa
                                    </label>
                                    <div className="space-y-4">
                                        {formData.coverImage && (
                                            <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                                <img
                                                    src={formData.coverImage}
                                                    alt="Cover"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {category.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Quốc gia
                                    </label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) =>
                                            setFormData({ ...formData, country: e.target.value })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                                    >
                                        <option value="DRAFT">Bản nháp</option>
                                        <option value="ONGOING">Đang ra</option>
                                        <option value="COMPLETED">Hoàn thành</option>
                                        <option value="PUBLISHED">Đã xuất bản</option>
                                        <option value="ARCHIVED">Lưu trữ</option>
                                    </select>
                                </div>

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
                                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

