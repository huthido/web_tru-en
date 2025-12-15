'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { useCreateStory } from '@/lib/api/hooks/use-stories';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { storiesService } from '@/lib/api/stories.service';

export default function CreateStoryPage() {
    const router = useRouter();
    const { data: categoriesResponse } = useCategories();
    const categories = Array.isArray(categoriesResponse) ? categoriesResponse : [];
    const createMutation = useCreateStory();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        coverImage: '',
        categoryIds: [] as string[],
        country: 'VN',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);

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
            const response = await storiesService.uploadCover(file);
            if (response.data?.coverImage) {
                setFormData({ ...formData, coverImage: response.data.coverImage });
            }
        } catch (error: any) {
            console.error('Error uploading cover:', error);
            setErrors({ coverImage: error?.response?.data?.error || 'Có lỗi xảy ra khi upload ảnh' });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        if (!formData.title.trim()) {
            setErrors({ title: 'Tiêu đề là bắt buộc' });
            return;
        }

        try {
            // Tags = category names (from selected categories)
            const selectedCategories = categories.filter((cat: any) => 
                formData.categoryIds.includes(cat.id)
            );
            const tags = selectedCategories.map((cat: any) => cat.name);

            await createMutation.mutateAsync({
                title: formData.title,
                description: formData.description || undefined,
                coverImage: formData.coverImage || undefined,
                categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
                tags: tags.length > 0 ? tags : undefined,
                country: formData.country || undefined,
            });

            router.push('/author/dashboard');
        } catch (error: any) {
            console.error('Error creating story:', error);
            setErrors({ submit: error?.response?.data?.error || 'Có lỗi xảy ra khi tạo truyện' });
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                <Sidebar />
                <div className="md:ml-[120px] pb-16 md:pb-0">
                    <Header />
                    <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                                Tạo truyện mới
                            </h1>

                            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8 space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tiêu đề <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Nhập tiêu đề truyện (slug sẽ được tạo tự động)"
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={6}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        placeholder="Nhập mô tả truyện"
                                    />
                                </div>

                                {/* Cover Image */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ảnh bìa
                                    </label>
                                    <div className="space-y-3">
                                        {/* Upload Button */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {uploading ? 'Đang upload...' : 'Upload từ máy tính'}
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">hoặc</span>
                                            <input
                                                type="url"
                                                value={formData.coverImage}
                                                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Nhập URL ảnh"
                                            />
                                        </div>
                                        {errors.coverImage && (
                                            <p className="text-sm text-red-500">{errors.coverImage}</p>
                                        )}
                                        {formData.coverImage && (
                                            <div className="relative w-32 h-48 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                                                <img
                                                    src={formData.coverImage}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Categories (Tags = Categories) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Thể loại (Tags) <span className="text-xs text-gray-500">Chọn từ danh sách thể loại có sẵn</span>
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {categories.map((category: any) => (
                                            <label
                                                key={category.id}
                                                className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                                                categoryIds: formData.categoryIds.filter((id) => id !== category.id),
                                                            });
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{category.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {categories.length === 0 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Chưa có thể loại nào. Vui lòng liên hệ admin để thêm thể loại.
                                        </p>
                                    )}
                                </div>

                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Quốc gia
                                    </label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="VN">Việt Nam</option>
                                        <option value="CN">Trung Quốc</option>
                                        <option value="KR">Hàn Quốc</option>
                                        <option value="JP">Nhật Bản</option>
                                        <option value="US">Mỹ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>

                                {/* Error Message */}
                                {errors.submit && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex items-center justify-end gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending}
                                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? 'Đang tạo...' : 'Tạo truyện'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        </ProtectedRoute>
    );
}
