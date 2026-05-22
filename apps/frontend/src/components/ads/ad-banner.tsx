'use client';

import { useEffect, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition, Ad } from '@/lib/api/ads.service';

interface AdBannerProps {
    position: AdPosition;
    className?: string;
}

/**
 * Banner Ad Component
 * Displays banner ads at specified positions (TOP, BOTTOM, INLINE)
 */
export function AdBanner({ position, className = '' }: AdBannerProps) {
    const { data: bannerAds = [] } = useActiveAds(AdType.BANNER, position);
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [imageError, setImageError] = useState(false);
    const [hasTrackedView, setHasTrackedView] = useState(false);

    // Filter valid ads
    const validAds = bannerAds.filter((ad: Ad) => ad.imageUrl && ad.isActive);
    const currentAd = validAds[currentAdIndex];

    // Rotate ads every 30 seconds if multiple ads available
    useEffect(() => {
        if (validAds.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % validAds.length);
            setHasTrackedView(false);
            setImageError(false);
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [validAds.length]);

    // Track ad view when ad is displayed
    useEffect(() => {
        if (currentAd?.id && !hasTrackedView) {
            trackAdView.mutate(currentAd.id);
            setHasTrackedView(true);
        }
    }, [currentAd?.id, hasTrackedView]);

    // Handle ad click
    const handleAdClick = () => {
        if (currentAd?.id) {
            trackAdClick.mutate(currentAd.id);
        }
    };

    if (!currentAd || imageError) {
        return null;
    }

    const positionClasses = {
        [AdPosition.TOP]: 'mb-6',
        [AdPosition.BOTTOM]: 'mt-6 mb-6',
        [AdPosition.INLINE]: 'my-8',
        [AdPosition.SIDEBAR_LEFT]: '',
        [AdPosition.SIDEBAR_RIGHT]: '',
    };

    const containerClass = `w-full ${positionClasses[position]} ${className}`;

    return (
        <div className={containerClass}>
            <div className="w-full">
                {/* Ad Label */}
                <div className="text-center mb-2">
                    <span className="text-xs text-on-surface-variant">
                        Quảng cáo
                    </span>
                </div>

                {/* Ad Container */}
                <div className="relative w-full bg-surface-container-high rounded-lg overflow-hidden shadow-sm">
                    {currentAd.linkUrl ? (
                        <a
                            href={currentAd.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleAdClick}
                            className="block w-full"
                        >
                            <div className="relative w-full h-24 sm:h-32 md:h-40">
                                <OptimizedImage
                                    src={currentAd.imageUrl}
                                    alt={currentAd.title || 'Quảng cáo'}
                                    fill
                                    objectFit="cover"
                                    sizes={ImageSizes.banner}
                                    quality={85}
                                    placeholder="blur"
                                    unoptimized={shouldUnoptimizeImage(currentAd.imageUrl)}
                                    onError={() => {
                                        console.error('Failed to load banner ad:', currentAd.imageUrl);
                                        setImageError(true);
                                    }}
                                />
                            </div>
                        </a>
                    ) : (
                        <div className="relative w-full h-24 sm:h-32 md:h-40">
                            <OptimizedImage
                                src={currentAd.imageUrl}
                                alt={currentAd.title || 'Quảng cáo'}
                                fill
                                objectFit="cover"
                                sizes={ImageSizes.banner}
                                quality={85}
                                placeholder="blur"
                                unoptimized={shouldUnoptimizeImage(currentAd.imageUrl)}
                                onError={() => {
                                    console.error('Failed to load banner ad:', currentAd.imageUrl);
                                    setImageError(true);
                                }}
                            />
                        </div>
                    )}

                    {/* Ad Title (Optional) - Only show for INLINE position to avoid overlay issues */}
                    {position === AdPosition.INLINE && currentAd.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1">
                            <p className="text-xs sm:text-sm text-white truncate">
                                {currentAd.title}
                            </p>
                        </div>
                    )}

                    {/* Rotation Indicator */}
                    {validAds.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                            {currentAdIndex + 1}/{validAds.length}
                        </div>
                    )}
                </div>

                {/* Ad Description (Optional, shown below for INLINE position) */}
                {position === AdPosition.INLINE && currentAd.description && (
                    <div className="text-center mt-2">
                        <p className="text-xs sm:text-sm text-on-surface-variant">
                            {currentAd.description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
