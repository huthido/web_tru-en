'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, Coins, AlertCircle, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { useStoryAccess, useBuyStory } from '@/lib/api/hooks/use-stories';

/**
 * VIP whole-story purchase banner shown on the story-detail page.
 * Renders nothing unless the story's accessType is VIP.
 */
export function StoryVipBanner({ slug }: { slug: string }) {
    const { isAuthenticated } = useAuth();
    const { data: access } = useStoryAccess(slug);
    const { data: wallet } = useWalletBalance(isAuthenticated);
    const buyStory = useBuyStory(slug);
    const [error, setError] = useState<string | null>(null);

    if (!access || access.accessType !== 'VIP') return null;

    const price = access.price;
    const owned = access.purchased || access.privileged;
    const balance = wallet?.balance ?? 0;
    const insufficient = isAuthenticated && !owned && balance < price;
    const loginHref = `/login?redirect=${encodeURIComponent(`/truyen/${slug}`)}`;

    const handleBuy = async () => {
        setError(null);
        try {
            await buyStory.mutateAsync();
        } catch (e: any) {
            setError(
                e?.response?.data?.message || e?.message || 'Không thể mua truyện. Thử lại sau.'
            );
        }
    };

    return (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 md:p-5">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/40">
                    <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Truyện VIP</h3>
                    {owned ? (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            <Check size={16} /> Bạn đã mở khóa toàn bộ truyện này.
                        </p>
                    ) : (
                        <>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Mua một lần để đọc toàn bộ chương của truyện này.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-sm">
                                    <Coins className="h-4 w-4 text-amber-500" />
                                    {price.toLocaleString('vi-VN')} coin
                                </span>

                                {!isAuthenticated ? (
                                    <Link
                                        href={loginHref}
                                        className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Đăng nhập để mua
                                    </Link>
                                ) : (
                                    <button
                                        onClick={handleBuy}
                                        disabled={insufficient || buyStory.isPending}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {buyStory.isPending ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Đang mua...
                                            </>
                                        ) : (
                                            <>
                                                <Crown size={16} /> Mua trọn bộ
                                            </>
                                        )}
                                    </button>
                                )}

                                {isAuthenticated && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Số dư: {balance.toLocaleString('vi-VN')} coin
                                    </span>
                                )}
                            </div>

                            {insufficient && (
                                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                                    <AlertCircle size={15} />
                                    Số dư không đủ, cần thêm {(price - balance).toLocaleString('vi-VN')} coin.
                                </p>
                            )}
                            {error && (
                                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                                    <AlertCircle size={15} /> {error}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
