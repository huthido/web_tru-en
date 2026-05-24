'use client';

import { useEffect, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition, AdSourceType, type Ad } from '@/lib/api/ads.service';
import { AdsenseUnit } from './adsense-unit';
import { CustomScriptAd } from './custom-script-ad';

interface AdBannerProps {
    position: AdPosition;
    className?: string;
}

const POSITION_CLASSES: Record<AdPosition, string> = {
    [AdPosition.TOP]: 'mb-6',
    [AdPosition.BOTTOM]: 'mt-6 mb-6',
    [AdPosition.INLINE]: 'my-8',
    [AdPosition.SIDEBAR_LEFT]: '',
    [AdPosition.SIDEBAR_RIGHT]: '',
};

/**
 * Banner ad component — router theo `sourceType`:
 * - SELF_SERVED → <OptimizedImage> + manual tracking (giữ logic cũ)
 * - GOOGLE_ADSENSE → <AdsenseUnit> (ins + push adsbygoogle)
 * - CUSTOM_SCRIPT → <CustomScriptAd> (sandbox iframe)
 * - GOOGLE_ADMOB / FAN → bỏ qua (chỉ render trên mobile)
 *
 * Backend `/ads/active?platform=web` đã loại sourceType không phù hợp web,
 * nhưng vẫn check phòng race condition cấu hình cũ.
 */
export function AdBanner({ position, className = '' }: AdBannerProps) {
    const { data: bannerAds = [] } = useActiveAds(AdType.BANNER, position);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    // Loại sourceType không render được trên web.
    const validAds = bannerAds.filter(
        (ad: Ad) =>
            ad.isActive &&
            ad.sourceType !== AdSourceType.GOOGLE_ADMOB &&
            ad.sourceType !== AdSourceType.FAN,
    );
    const currentAd = validAds[currentAdIndex];

    // Rotate every 30s nếu nhiều ads. Reset index khi danh sách đổi.
    useEffect(() => {
        if (validAds.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % validAds.length);
        }, 30000);
        return () => clearInterval(interval);
    }, [validAds.length]);

    if (!currentAd) return null;

    const containerClass = `w-full ${POSITION_CLASSES[position]} ${className}`;

    return (
        <div className={containerClass}>
            <div className="w-full">
                {/* Ad Label — bắt buộc theo guidelines, kể cả với AdSense */}
                <div className="text-center mb-2">
                    <span className="text-xs text-on-surface-variant">Quảng cáo</span>
                </div>

                <div className="relative w-full bg-surface-container-high rounded-lg overflow-hidden shadow-sm">
                    {renderBySourceType(currentAd, position)}

                    {/* Rotation indicator */}
                    {validAds.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
                            {currentAdIndex + 1}/{validAds.length}
                        </div>
                    )}
                </div>

                {/* Description chỉ hiện ở INLINE để không cản layout */}
                {position === AdPosition.INLINE && currentAd.description && currentAd.sourceType === AdSourceType.SELF_SERVED && (
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

function renderBySourceType(ad: Ad, position: AdPosition) {
    switch (ad.sourceType) {
        case AdSourceType.GOOGLE_ADSENSE:
            return (
                <div className="min-h-[100px] w-full">
                    <AdsenseUnit ad={ad} />
                </div>
            );
        case AdSourceType.CUSTOM_SCRIPT:
            return (
                <div className="min-h-[100px] w-full">
                    <CustomScriptAd ad={ad} className="min-h-[100px]" />
                </div>
            );
        case AdSourceType.SELF_SERVED:
        default:
            return <SelfServedBanner ad={ad} position={position} />;
    }
}

function SelfServedBanner({ ad, position }: { ad: Ad; position: AdPosition }) {
    const trackAdView = useTrackAdView();
    const trackAdClick = useTrackAdClick();
    const [imageError, setImageError] = useState(false);
    const [hasTrackedView, setHasTrackedView] = useState(false);

    useEffect(() => {
        if (ad.id && !hasTrackedView) {
            trackAdView.mutate(ad.id);
            setHasTrackedView(true);
        }
        // Reset khi ad đổi (parent rotate)
        setImageError(false);
    }, [ad.id]);

    if (imageError || !ad.imageUrl) return null;

    const handleClick = () => {
        if (ad.id) trackAdClick.mutate(ad.id);
    };

    const image = (
        <div className="relative w-full h-24 sm:h-32 md:h-40">
            <OptimizedImage
                src={ad.imageUrl}
                alt={ad.title || 'Quảng cáo'}
                fill
                objectFit="cover"
                sizes={ImageSizes.banner}
                quality={85}
                placeholder="blur"
                unoptimized={shouldUnoptimizeImage(ad.imageUrl)}
                onError={() => setImageError(true)}
            />
        </div>
    );

    return (
        <>
            {ad.linkUrl ? (
                <a
                    href={ad.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    onClick={handleClick}
                    className="block w-full"
                >
                    {image}
                </a>
            ) : (
                image
            )}

            {position === AdPosition.INLINE && ad.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1">
                    <p className="text-xs sm:text-sm text-white truncate">{ad.title}</p>
                </div>
            )}
        </>
    );
}
