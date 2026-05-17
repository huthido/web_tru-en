'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { useBuyChapter } from '@/lib/api/hooks/use-chapters';
import { useBuyStory } from '@/lib/api/hooks/use-stories';

interface ChapterPaywallProps {
    storySlug: string;
    chapterSlug: string;
    chapterId: string;
    title: string;
    /** Story title — shown when the lock is at story level (VIP). */
    storyTitle?: string;
    price: number;
    /** 'CHAPTER' = buy this chapter (freemium). 'STORY' = buy whole VIP story. */
    lockType: 'CHAPTER' | 'STORY';
    /** Short teaser returned by the backend for a locked chapter. */
    preview?: string;
}

export function ChapterPaywall({
    storySlug,
    chapterSlug,
    chapterId,
    title,
    storyTitle,
    price,
    lockType,
    preview,
}: ChapterPaywallProps) {
    const { isAuthenticated } = useAuth();
    const { data: wallet } = useWalletBalance(isAuthenticated);
    const buyChapter = useBuyChapter(storySlug);
    const buyStory = useBuyStory(storySlug);
    const [error, setError] = useState<string | null>(null);

    const isStory = lockType === 'STORY';
    const pending = isStory ? buyStory.isPending : buyChapter.isPending;
    const balance = wallet?.balance ?? 0;
    const insufficient = isAuthenticated && balance < price;
    const loginHref = `/login?redirect=${encodeURIComponent(`/stories/${storySlug}/chapters/${chapterSlug}`)}`;

    const unlockLabel = isStory ? 'Mở khóa cả truyện' : 'Mở khóa chương';
    const heading = isStory ? 'Truyện VIP — cần mở khóa' : 'Chương này cần mở khóa';
    const subject = isStory ? (storyTitle || 'truyện này') : title;

    const handleUnlock = async () => {
        setError(null);
        try {
            if (isStory) {
                await buyStory.mutateAsync();
            } else {
                await buyChapter.mutateAsync({ id: chapterId, chapterSlug });
            }
            // On success the relevant queries refetch and this component
            // unmounts, replaced by the full content.
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                e?.message ||
                'Không thể mở khóa. Vui lòng thử lại.'
            );
        }
    };

    return (
        <div className="relative">
            {/* Teaser — faded out at the bottom */}
            {preview && (
                <div className="relative max-h-48 overflow-hidden">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {preview}
                    </p>
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white dark:to-gray-800" />
                </div>
            )}

            {/* Paywall card */}
            <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-6 md:p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/40">
                    <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>

                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {heading}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                    Mở khóa <span className="font-semibold text-gray-900 dark:text-white">“{subject}”</span>{' '}
                    {isStory
                        ? 'để đọc toàn bộ chương và ủng hộ tác giả.'
                        : 'để đọc toàn bộ nội dung và ủng hộ tác giả.'}
                </p>

                <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 px-4 py-2 mb-5 shadow-sm">
                    <Coins className="h-5 w-5 text-amber-500" />
                    <span className="font-bold text-gray-900 dark:text-white">
                        {price.toLocaleString('vi-VN')} coin
                    </span>
                </div>

                {!isAuthenticated ? (
                    <div>
                        <Link
                            href={loginHref}
                            className="inline-flex items-center justify-center px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Đăng nhập để mở khóa
                        </Link>
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            Bạn cần đăng nhập và có đủ coin để mở khóa.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Số dư của bạn:{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {balance.toLocaleString('vi-VN')} coin
                            </span>
                        </p>

                        {insufficient && (
                            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800 mb-4">
                                <AlertCircle size={18} />
                                <span className="text-sm font-medium">
                                    Số dư không đủ. Bạn cần thêm{' '}
                                    {(price - balance).toLocaleString('vi-VN')} coin.
                                </span>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800 mb-4">
                                <AlertCircle size={18} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleUnlock}
                            disabled={insufficient || pending}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {pending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Đang mở khóa...
                                </>
                            ) : (
                                <>
                                    <Lock size={18} />
                                    {unlockLabel} {price.toLocaleString('vi-VN')} coin
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
