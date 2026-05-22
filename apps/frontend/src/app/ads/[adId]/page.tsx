'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import Link from 'next/link';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType } from '@/lib/api/ads.service';

export default function AdPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const adId = params.adId as string;
    const returnUrl = searchParams.get('return') || '/';
    const storySlug = searchParams.get('story');
    const nextChapterSlug = searchParams.get('next');
    const prevChapterSlug = searchParams.get('prev');

    const { data: popupAds = [], isLoading } = useActiveAds(AdType.POPUP);
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();

    const [selectedAd, setSelectedAd] = useState<any>(null);
    const hasTrackedView = useRef<string | null>(null); // Track which ad ID has been tracked
    const lastAdIdRef = useRef<string | null>(null); // Track last processed adId

    // Separate effect for setting ad
    useEffect(() => {
        if (isLoading || popupAds.length === 0) return;

        // Reset tracking when adId changes
        if (lastAdIdRef.current !== adId) {
            hasTrackedView.current = null;
            lastAdIdRef.current = adId;
            setSelectedAd(null); // Reset selected ad
        }

        // Find ad by ID, or use first available ad
        const ad = popupAds.find((a: any) => a.id === adId) || popupAds[0];
        if (ad && (!selectedAd || selectedAd.id !== ad.id)) {
            setSelectedAd(ad);
        }
    }, [adId, isLoading, popupAds.length]); // Only depend on length, not the array itself

    // Separate effect for tracking view (only once per ad)
    useEffect(() => {
        if (!selectedAd?.id || hasTrackedView.current === selectedAd.id) return;

        hasTrackedView.current = selectedAd.id;
        // Use setTimeout to avoid calling in render
        const timer = setTimeout(() => {
            trackAdView.mutate(selectedAd.id);
        }, 100);

        return () => clearTimeout(timer);
    }, [selectedAd?.id]); // Only depend on ad ID

    const handleContinue = () => {
        if (nextChapterSlug && storySlug) {
            router.push(`/stories/${storySlug}/chapters/${nextChapterSlug}`);
        } else if (prevChapterSlug && storySlug) {
            router.push(`/stories/${storySlug}/chapters/${prevChapterSlug}`);
        } else {
            router.push(returnUrl);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface">
                <Sidebar />
                <div className="md:ml-[120px]">
                    <Header />
                    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                        <Loading />
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedAd) {
        return (
            <div className="min-h-screen bg-surface">
                <Sidebar />
                <div className="md:ml-[120px]">
                    <Header />
                    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-on-surface mb-4">
                                Không tìm thấy quảng cáo
                            </h1>
                            <button
                                onClick={handleContinue}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                            >
                                Tiếp tục đọc
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen   transition-colors duration-300">
            <Sidebar />
            <div className="md:ml-[120px] pb-16 md:pb-0">
                <Header />
                <main className="pt-2 md:pt-8 pb-6 md:pb-12 min-h-[calc(100vh-60px)]">
                    <div className="max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6">
                        {/* Back Button - Return to chapter page */}
                        {(returnUrl || storySlug) && (
                            <div className="mb-6">
                                <Link
                                    href={returnUrl || (storySlug ? `/truyen/${storySlug}` : '/')}
                                    className="text-blue-500 hover:text-primary mb-2 inline-block text-left"
                                >
                                    ← Quay lại
                                </Link>
                            </div>
                        )}

                        {/* Ad Content - Full width, no padding */}
                        <div className="rounded-lg md:rounded-[15px] shadow-sm overflow-hidden flex flex-col">
                            {/* Sponsored Label - Separated at top */}
                            <div className="w-full px-2 sm:px-3 md:px-4 py-2 md:py-3 text-left">
                                <span className="text-xs sm:text-sm font-medium text-on-surface-variant">
                                    Được tài trợ
                                </span>
                            </div>

                            {/* Ad Image - Square shape with full image display */}
                            <div className="w-full relative">
                                {selectedAd.imageUrl ? (
                                    <div className="w-full relative">
                                        {selectedAd.linkUrl ? (
                                            <a
                                                href={selectedAd.linkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full"
                                                onClick={() => {
                                                    if (selectedAd.id) {
                                                        trackAdClick.mutate(selectedAd.id);
                                                    }
                                                }}
                                            >
                                                <div className="relative w-full aspect-square bg-surface-container-high">
                                                    <OptimizedImage
                                                        src={selectedAd.imageUrl}
                                                        alt={selectedAd.title || 'Quảng cáo'}
                                                        fill
                                                        objectFit="contain"
                                                        sizes={ImageSizes.adFull}
                                                        quality={90}
                                                        placeholder="blur"
                                                        priority
                                                        unoptimized={shouldUnoptimizeImage(selectedAd.imageUrl)}
                                                    />
                                                </div>
                                            </a>
                                        ) : (
                                            <div className="relative w-full aspect-square bg-surface-container-high">
                                                <OptimizedImage
                                                    src={selectedAd.imageUrl}
                                                    alt={selectedAd.title || 'Quảng cáo'}
                                                    fill
                                                    objectFit="contain"
                                                    sizes={ImageSizes.adFull}
                                                    quality={90}
                                                    placeholder="blur"
                                                    priority
                                                    unoptimized={shouldUnoptimizeImage(selectedAd.imageUrl)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-on-surface-variant py-20">
                                        <p>Không có hình ảnh quảng cáo</p>
                                    </div>
                                )}
                            </div>

                            {/* Continue Button - Moved to bottom, separate section */}
                            <div className="w-full px-2 sm:px-3 md:px-4 py-2 md:py-3">
                                <button
                                    onClick={handleContinue}
                                    className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-700 dark:hover:to-indigo-700 rounded-md text-white font-medium text-xs sm:text-sm transition-all duration-200 shadow hover:shadow-md"
                                >
                                    Tiếp tục đọc
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}

