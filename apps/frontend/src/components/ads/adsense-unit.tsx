'use client';

import { useEffect, useRef } from 'react';
import { useAdsConfig } from '@/lib/api/hooks/use-ads-config';
import { useAdsConsent } from '@/lib/ads/consent-context';
import type { Ad } from '@/lib/api/ads.service';

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

interface Props {
    ad: Ad;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Render 1 ad unit AdSense: `<ins class="adsbygoogle">` + push vào queue
 * `window.adsbygoogle`. Chỉ render khi đã có publisher ID + consent OK.
 * Mỗi instance push 1 lần khi mount; tránh re-push vô limit bằng ref.
 */
export function AdsenseUnit({ ad, className, style }: Props) {
    const { data: config } = useAdsConfig();
    const { consented } = useAdsConsent();
    const pushedRef = useRef(false);

    const publisherId = config?.googleAdsensePublisherId;
    const adSlot = ad.networkConfig?.adUnitId;
    const format = ad.networkConfig?.format ?? 'auto';
    const responsive = ad.networkConfig?.responsive ?? true;
    const enabled =
        !!config?.adsEnabled && !!publisherId && !!adSlot && (!config.consentRequired || consented);

    useEffect(() => {
        if (!enabled || pushedRef.current) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushedRef.current = true;
        } catch (err) {
            // AdSense script chưa load xong — sẽ tự reflow khi script ready.
            console.warn('[adsense] push failed:', err);
        }
    }, [enabled]);

    if (!enabled) return null;

    return (
        <ins
            className={`adsbygoogle ${className ?? ''}`}
            style={style ?? { display: 'block' }}
            data-ad-client={publisherId!}
            data-ad-slot={adSlot!}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
        />
    );
}
