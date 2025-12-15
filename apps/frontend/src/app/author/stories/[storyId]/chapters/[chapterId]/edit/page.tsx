'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { useUpdateChapter } from '@/lib/api/hooks/use-chapters';
import { useStory } from '@/lib/api/hooks/use-stories';
import { chaptersService } from '@/lib/api/chapters.service';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Loading } from '@/components/ui/loading';

export default function EditChapterPage() {
    const params = useParams();
    const router = useRouter();
    const storyIdOrSlug = params.storyId as string;
    const chapterId = params.chapterId as string;
    
    const { data: story, isLoading: storyLoading } = useStory(storyIdOrSlug);
    const storySlug = story?.slug || storyIdOrSlug;
    const updateMutation = useUpdateChapter(storySlug);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [chapter, setChapter] = useState<any>(null);

    useEffect(() => {
        const fetchChapter = async () => {
            try {
                // Get chapter by ID
                const response = await chaptersService.getById(storySlug, chapterId);
                const chapterData = Array.isArray(response) 
                    ? response[0] 
                    : ((response as any).data || response);
                
                if (chapterData && chapterData.id) {
                    setChapter(chapterData);
                    setFormData({
                        title: chapterData.title || '',
                        content: chapterData.content || '',
                    });
                } else {
                    setErrors({ submit: 'Không tìm thấy chương' });
                }
            } catch (error: any) {
                console.error('Error fetching chapter:', error);
                setErrors({ submit: error?.message || 'Có lỗi xảy ra khi tải thông tin chương' });
            } finally {
                setIsLoading(false);
            }
        };

        if (storySlug && chapterId) {
            fetchChapter();
        }
    }, [storySlug, chapterId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        if (!formData.title.trim()) {
            setErrors({ title: 'Tên chương là bắt buộc' });
            return;
        }

        if (!formData.content.trim()) {
            setErrors({ content: 'Nội dung chương là bắt buộc' });
            return;
        }

        if (formData.content.trim().length < 100) {
            setErrors({ content: 'Nội dung chương phải có ít nhất 100 ký tự' });
            return;
        }

        try {
            await updateMutation.mutateAsync({
                id: chapterId,
                data: {
                    title: formData.title.trim(),
                    content: formData.content.trim(),
                },
            });

            router.push(`/author/stories/${storySlug}/chapters`);
        } catch (error: any) {
            console.error('Error updating chapter:', error);
            setErrors({ 
                submit: error?.response?.data?.error || 'Có lỗi xảy ra khi cập nhật chương' 
            });
        }
    };

    if (storyLoading || isLoading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                    <Sidebar />
                    <div className="md:ml-[120px] pb-16 md:pb-0">
                        <Header />
                        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
                            <Loading message="Đang tải thông tin..." />
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!chapter) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                    <Sidebar />
                    <div className="md:ml-[120px] pb-16 md:pb-0">
                        <Header />
                        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8 text-center">
                                    <p className="text-red-500 dark:text-red-400 mb-4">
                                        {errors.submit || 'Không tìm thấy chương'}
                                    </p>
                                    <Link
                                        href={`/author/stories/${storySlug}/chapters`}
                                        className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Quay lại
                                    </Link>
                                </div>
                            </div>
                        </main>
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
                            {/* Header */}
                            <div className="mb-6 md:mb-8">
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    Chỉnh sửa chương
                                </h1>
                                {story && (
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Truyện: {story.title}
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8 space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tên chương <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Nhập tên chương"
                                        maxLength={200}
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {formData.title.length}/200 ký tự
                                    </p>
                                    {errors.title && (
                                        <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                                    )}
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nội dung chương <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows={20}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                                        placeholder="Nhập nội dung chương (tối thiểu 100 ký tự)..."
                                    />
                                    <div className="mt-2 flex items-center justify-between">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formData.content.length} ký tự {formData.content.length < 100 && `(cần thêm ${100 - formData.content.length} ký tự nữa)`}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Khoảng {Math.ceil(formData.content.length / 2000)} trang
                                        </p>
                                    </div>
                                    {errors.content && (
                                        <p className="mt-1 text-sm text-red-500">{errors.content}</p>
                                    )}
                                </div>

                                {/* Error Message */}
                                {errors.submit && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        href={`/author/stories/${storySlug}/chapters`}
                                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Hủy
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={updateMutation.isPending || formData.content.length < 100}
                                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updateMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật chương'}
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

