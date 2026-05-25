'use client';

import { useEffect, useMemo, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { useActiveAds, useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';
import { AdType, AdPosition, AdSourceType, type Ad, type AdDisplayConfig } from '@/lib/api/ads.service';
import { AdsenseUnit } from './adsense-unit';
import { CustomScriptAd } from './custom-script-ad';

interface AdBannerProps {
    position: AdPosition;
    className?: string;
    /**
     * Mode mới — caller (vd AdSlot) truyền ads đã fetch + displayConfig override.
     * Khi truyền vào, component bỏ qua `useActiveAds(BANNER, position)` fetch nội bộ.
     * Để undefined → fallback legacy behaviour (backward-compat).
     */
    ads?: Ad[];
    displayConfig?: AdDisplayConfig | null;
}

const POSITION_CLASSES: Record<AdPosition, string> = {
    [AdPosition.TOP]: 'mb-6',
    [AdPosition.BOTTOM]: 'mt-6 mb-6',
    [AdPosition.INLINE]: 'my-8',
    [AdPosition.SIDEBAR_LEFT]: '',
    [AdPosition.SIDEBAR_RIGHT]: '',
};

const DEFAULT_HEIGHTS = { base: 'h-24', sm: 'h-32', md: 'h-40' };
const DEFAULT_ROTATE_MS = 30_000;

/**
 * Banner ad component — router theo `sourceType`:
 * - SELF_SERVED → <OptimizedImage> + manual tracking (giữ logic cũ)
 * - GOOGLE_ADSENSE → <AdsenseUnit> (ins + push adsbygoogle)
 * - CUSTOM_SCRIPT → <CustomScriptAd> (sandbox iframe)
 * - GOOGLE_ADMOB / FAN → bỏ qua (chỉ render trên mobile)
 *
 * 2 chế độ:
 * - Legacy: chỉ truyền `position` → component tự fetch ads theo (BANNER, position).
 * - Slot mode: caller truyền `ads[]` + `displayConfig` → component chỉ render,
 *   không fetch (cho phép AdSlot fetch theo slotKey rồi pass xuống).
 */
export function AdBanner({ position, className = '', ads, displayConfig }: AdBannerProps) {
    const legacy = useActiveAds(AdType.BANNER, position);
    const sourceAds: Ad[] = ads ?? legacy.data ?? [];
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    const validAds = useMemo(
        () => sourceAds.filter(
            (ad: Ad) =>
                ad.isActive &&
                ad.sourceType !== AdSourceType.GOOGLE_ADMOB &&
                ad.sourceType !== AdSourceType.FAN,
        ),
        [sourceAds],
    );
    const currentAd = validAds[currentAdIndex];

    const rotateMs = displayConfig?.rotateInterval ?? DEFAULT_ROTATE_MS;

    useEffect(() => {
        if (validAds.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % validAds.length);
        }, rotateMs);
        return () => clearInterval(interval);
    }, [validAds.length, rotateMs]);

    if (!currentAd) return null;

    const containerClass = `w-full ${POSITION_CLASSES[position]} ${className}`;

    return (
        <div className={containerClass}>
            <div className="w-full">
                {/* Ad Label — bắt buộc theo guidelines, kể cả với AdSense */}
                <div className="text-center mb-2">
                    <span className="text-xs text-on-surface-variant">Quảng cáo</span>
                </div>

                <div
                    className="relative w-full bg-surface-container-high rounded-lg overflow-hidden shadow-sm"
                    style={displayConfig?.customCss ? parseCustomCss(displayConfig.customCss) : undefined}
                >
                    {renderBySourceType(currentAd, position, displayConfig ?? currentAd.displayConfig ?? null)}

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

function renderBySourceType(ad: Ad, position: AdPosition, displayConfig: AdDisplayConfig | null) {
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
            return <SelfServedBanner ad={ad} position={position} displayConfig={displayConfig} />;
    }
}

function SelfServedBanner({ ad, position, displayConfig }: { ad: Ad; position: AdPosition; displayConfig: AdDisplayConfig | null }) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ad.id]);

    if (imageError || !ad.imageUrl) return null;

    const handleClick = () => {
        if (ad.id) trackAdClick.mutate(ad.id);
    };

    const heights = { ...DEFAULT_HEIGHTS, ...(displayConfig?.heights ?? {}) };
    const heightClass = `${heights.base} sm:${heights.sm} md:${heights.md}`.replace(/\s+/g, ' ').trim();
    const openInNewTab = displayConfig?.openInNewTab ?? true;

    const image = (
        <div className={`relative w-full ${heightClass}`}>
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
                    target={openInNewTab ? '_blank' : undefined}
                    rel={openInNewTab ? 'noopener noreferrer sponsored' : 'sponsored'}
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

/**
 * Parse customCss string thành React inline style — chỉ accept declarations
 * dạng `property: value;`. Sai format → bỏ qua không throw.
 */
function parseCustomCss(css: string): React.CSSProperties {
    const style: Record<string, string> = {};
    for (const decl of css.split(';')) {
        const [k, ...rest] = decl.split(':');
        if (!k || rest.length === 0) continue;
        const key = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (key) style[key] = rest.join(':').trim();
    }
    return style as React.CSSProperties;
}
