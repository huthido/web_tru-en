'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition, Ad } from '@/lib/api/ads.service';

interface AdSidebarProps {
    position?: AdPosition.SIDEBAR_LEFT | AdPosition.SIDEBAR_RIGHT;
    className?: string;
    /** Slot mode — caller (AdSlot) truyền ads + maxAds, skip fetch nội bộ. */
    ads?: Ad[];
    maxAds?: number;
}

const DEFAULT_MAX_ADS = 2;

/**
 * Sidebar Ad Component (Facebook-style)
 * 2 chế độ:
 * - Legacy: tự fetch ads SIDEBAR_LEFT, hardcode max 2.
 * - Slot mode: caller truyền `ads` + `maxAds`.
 */
export function AdSidebar({ position = AdPosition.SIDEBAR_LEFT, className = '', ads, maxAds }: AdSidebarProps) {
    const legacy = useActiveAds(AdType.SIDEBAR, position);
    const sourceAds: Ad[] = ads ?? legacy.data ?? [];
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();
    const trackedAdIdsRef = useRef<Set<string>>(new Set());
    const effectiveMax = maxAds ?? DEFAULT_MAX_ADS;

    const allSidebarAds: Ad[] = useMemo(() => {
        return sourceAds
            .filter((ad: Ad) => ad.imageUrl && ad.isActive)
            .slice(0, effectiveMax);
    }, [sourceAds, effectiveMax]);

    const adIdsString = useMemo(() => {
        return allSidebarAds.map(ad => ad.id).filter(Boolean).sort().join(',');
    }, [allSidebarAds]);

    useEffect(() => {
        allSidebarAds.forEach((ad) => {
            if (ad.id && !trackedAdIdsRef.current.has(ad.id)) {
                trackAdView.mutate(ad.id);
                trackedAdIdsRef.current.add(ad.id);
            }
        });
        const currentAdIds = new Set(allSidebarAds.map(ad => ad.id).filter(Boolean));
        trackedAdIdsRef.current.forEach((trackedId) => {
            if (!currentAdIds.has(trackedId)) {
                trackedAdIdsRef.current.delete(trackedId);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adIdsString]);

    const handleAdClick = (adId: string) => {
        trackAdClick.mutate(adId);
    };

    if (allSidebarAds.length === 0) {
        return null;
    }

    return (
        <aside className={`hidden lg:block w-56 flex-shrink-0 self-start sticky top-[80px] ${className}`} style={{ position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>
            <div className="space-y-3">
                <div className="text-xs text-on-surface-variant font-medium mb-2">
                    Được tài trợ
                </div>

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

function AdSidebarCard({ ad, onClick }: { ad: Ad; onClick: () => void }) {
    const [imageError, setImageError] = useState(false);

    const getDomain = (url?: string) => {
        if (!url) return '';
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    const openInNewTab = ad.displayConfig?.openInNewTab ?? true;

    return (
        <div className="bg-surface-container rounded-lg overflow-hidden border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
            {ad.linkUrl ? (
                <a
                    href={ad.linkUrl}
                    target={openInNewTab ? '_blank' : undefined}
                    rel={openInNewTab ? 'noopener noreferrer sponsored' : 'sponsored'}
                    onClick={onClick}
                    className="block"
                >
                    <CardContent ad={ad} imageError={imageError} setImageError={setImageError} getDomain={getDomain} />
                </a>
            ) : (
                <div>
                    <CardContent ad={ad} imageError={imageError} setImageError={setImageError} getDomain={getDomain} />
                </div>
            )}
        </div>
    );
}

function CardContent({
    ad,
    imageError,
    setImageError,
    getDomain,
}: {
    ad: Ad;
    imageError: boolean;
    setImageError: (v: boolean) => void;
    getDomain: (url?: string) => string;
}) {
    return (
        <div className="p-2.5">
            <div className="relative w-full h-32 mb-2 bg-surface-container-high rounded overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs">
                        No Image
                    </div>
                )}
            </div>
            <div className="space-y-1">
                {ad.title && (
                    <h3 className="text-sm font-semibold text-on-surface line-clamp-2 leading-tight">
                        {ad.title}
                    </h3>
                )}
                {ad.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {ad.description}
                    </p>
                )}
                {ad.linkUrl && (
                    <div className="text-xs text-on-surface-variant mt-1">
                        {getDomain(ad.linkUrl)}
                    </div>
                )}
            </div>
        </div>
    );
}
