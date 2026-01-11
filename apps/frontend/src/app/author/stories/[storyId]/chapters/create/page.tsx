'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { useCreateChapter } from '@/lib/api/hooks/use-chapters';
import { useStory } from '@/lib/api/hooks/use-stories';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Loading } from '@/components/ui/loading';

export default function CreateChapterPage() {
    const params = useParams();
    const router = useRouter();
    const storyIdOrSlug = params.storyId as string;
    
    const { data: story, isLoading: storyLoading } = useStory(storyIdOrSlug);
    const storySlug = story?.slug || storyIdOrSlug;
    const createMutation = useCreateChapter(storySlug);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

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
            await createMutation.mutateAsync({
                title: formData.title.trim(),
                content: formData.content.trim(),
            });

            // Wait a bit to ensure cache is updated before navigation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            router.push(`/author/stories/${storySlug}/chapters`);
        } catch (error: any) {
            console.error('Error creating chapter:', error);
            setErrors({ 
                submit: error?.response?.data?.error || 'Có lỗi xảy ra khi tạo chương' 
            });
        }
    };

    if (storyLoading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 transition-colors duration-300">
                    <Sidebar />
                    <div className="md:ml-[120px] pb-16 md:pb-0">
                        <Header />
                        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
                            <Loading message="Đang tải thông tin truyện..." />
                        </div>
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
                        <div className="max-w-5xl mx-auto">
                            {/* Header */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                            Tạo chương mới
                                        </h1>
                                        {story && (
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Truyện: <span className="font-medium text-gray-900 dark:text-white">{story.title}</span>
                                            </p>
                                        )}
                                    </div>
                                    <Link
                                        href={`/author/stories/${storySlug}/chapters`}
                                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        Quay lại
                                    </Link>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8 space-y-6 border border-gray-200 dark:border-gray-700">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tên chương <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="VD: Chương 1: Khởi đầu"
                                        maxLength={200}
                                    />
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                                        rows={25}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-base leading-relaxed"
                                        placeholder="Nhập nội dung chương (tối thiểu 100 ký tự)..."
                                    />
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-4">
                                            <span className={formData.content.length < 100 ? 'text-orange-500 dark:text-orange-400 font-medium' : ''}>
                                                {formData.content.length.toLocaleString()} ký tự
                                                {formData.content.length < 100 && ` (cần thêm ${100 - formData.content.length})`}
                                            </span>
                                            <span>•</span>
                                            <span>{Math.ceil(formData.content.length / 2000)} trang</span>
                                        </div>
                                        <span className="text-gray-400 dark:text-gray-500">Không giới hạn độ dài</span>
                                    </div>
                                    {errors.content && (
                                        <p className="mt-2 text-sm text-red-500">{errors.content}</p>
                                    )}
                                </div>

                                {/* Error Message */}
                                {errors.submit && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        href={`/author/stories/${storySlug}/chapters`}
                                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        Hủy
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || formData.content.length < 100}
                                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                    >
                                        {createMutation.isPending ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                                </svg>
                                                Đang tạo...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                                    <polyline points="17 21 17 13 7 13 7 21"/>
                                                    <polyline points="7 3 7 8 15 8"/>
                                                </svg>
                                                Tạo chương
                                            </>
                                        )}
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

