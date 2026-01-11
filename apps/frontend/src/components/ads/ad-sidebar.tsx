'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition, Ad } from '@/lib/api/ads.service';

interface AdSidebarProps {
    position?: AdPosition.SIDEBAR_LEFT | AdPosition.SIDEBAR_RIGHT;
    className?: string;
}

/**
 * Sidebar Ad Component (Facebook-style)
 * Displays both LEFT and RIGHT sidebar ads on the right side, stacked vertically
 */
export function AdSidebar({ position, className = '' }: AdSidebarProps) {
    const { data: sidebarLeftAds = [] } = useActiveAds(AdType.SIDEBAR, AdPosition.SIDEBAR_LEFT);
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();
    const trackedAdIdsRef = useRef<Set<string>>(new Set());

    // Logic hiển thị sidebar ads:
    // - Chỉ lấy ads từ SIDEBAR_LEFT (không lấy SIDEBAR_RIGHT nữa)
    // - Filter: chỉ lấy ads có imageUrl và isActive = true
    // - Limit: tối đa 3 ads để sidebar vừa phải, không quá dài
    const allSidebarAds: Ad[] = useMemo(() => {
        return (sidebarLeftAds as Ad[])
            .filter((ad: Ad) => ad.imageUrl && ad.isActive)
            .slice(0, 2); // Giới hạn tối đa 2 ads
    }, [sidebarLeftAds]);

    // Track ad IDs string for dependency
    const adIdsString = useMemo(() => {
        return allSidebarAds.map(ad => ad.id).filter(Boolean).sort().join(',');
    }, [allSidebarAds]);

    // Track views for all ads when ads change (only once per ad)
    useEffect(() => {
        allSidebarAds.forEach((ad) => {
            if (ad.id && !trackedAdIdsRef.current.has(ad.id)) {
                trackAdView.mutate(ad.id);
                trackedAdIdsRef.current.add(ad.id);
            }
        });
        // Cleanup: remove old ad IDs that are no longer in the list
        const currentAdIds = new Set(allSidebarAds.map(ad => ad.id).filter(Boolean));
        trackedAdIdsRef.current.forEach((trackedId) => {
            if (!currentAdIds.has(trackedId)) {
                trackedAdIdsRef.current.delete(trackedId);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adIdsString]); // Only depend on adIdsString, not trackAdView

    // Handle ad click
    const handleAdClick = (adId: string) => {
        trackAdClick.mutate(adId);
    };

    if (allSidebarAds.length === 0) {
        return null;
    }

    return (
        <aside className={`hidden lg:block w-56 flex-shrink-0 self-start sticky top-[80px] ${className}`} style={{ position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>
            <div className="space-y-3">
                {/* Sponsored Label */}
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                    Được tài trợ
                </div>

                {/* Stacked Ads (Facebook-style) */}
                {allSidebarAds.map((ad: Ad, index: number) => (
                    <AdSidebarCard
                        key={ad.id || index}
                        ad={ad}
                        onClick={() => handleAdClick(ad.id)}
                    />
                ))}
            </div>
        </aside>
    );
}

/**
 * Individual Sidebar Ad Card (Facebook-style)
 */
function AdSidebarCard({ ad, onClick }: { ad: Ad; onClick: () => void }) {
    const [imageError, setImageError] = useState(false);

    // Extract domain from linkUrl for display
    const getDomain = (url?: string) => {
        if (!url) return '';
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain;
        } catch {
            return url;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            {ad.linkUrl ? (
                <a
                    href={ad.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClick}
                    className="block"
                >
                    <div className="p-2.5">
                        {/* Image */}
                        <div className="relative w-full h-32 mb-2 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                            {ad.imageUrl && !imageError ? (
                                <OptimizedImage
                                    src={ad.imageUrl}
                                    alt={ad.title || 'Quảng cáo'}
                                    fill
                                    objectFit="cover"
                                    sizes={ImageSizes.sidebar}
                                    quality={85}
                                    placeholder="blur"
                                    unoptimized={shouldUnoptimizeImage(ad.imageUrl)}
                                    onError={() => {
                                        console.error('Failed to load sidebar ad:', ad.imageUrl);
                                        setImageError(true);
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    No Image
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                            {ad.title && (
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                                    {ad.title}
                                </h3>
                            )}
                            {ad.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                    {ad.description}
                                </p>
                            )}
                            {ad.linkUrl && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {getDomain(ad.linkUrl)}
                                </div>
                            )}
                        </div>
                    </div>
                </a>
            ) : (
                <div className="p-2.5">
                    {/* Image */}
                    <div className="relative w-full h-32 mb-2 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                        {ad.imageUrl && !imageError ? (
                            <OptimizedImage
                                src={ad.imageUrl}
                                alt={ad.title || 'Quảng cáo'}
                                fill
                                objectFit="cover"
                                sizes={ImageSizes.sidebar}
                                quality={85}
                                placeholder="blur"
                                unoptimized={shouldUnoptimizeImage(ad.imageUrl)}
                                onError={() => {
                                    console.error('Failed to load sidebar ad:', ad.imageUrl);
                                    setImageError(true);
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No Image
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                        {ad.title && (
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                                {ad.title}
                            </h3>
                        )}
                        {ad.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                {ad.description}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
