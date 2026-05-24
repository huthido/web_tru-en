'use client';

import Script from 'next/script';
import { useAdsConfig } from '@/lib/api/hooks/use-ads-config';
import { useAdsConsent } from '@/lib/ads/consent-context';

/**
 * Load AdSense script global một lần — chỉ khi:
 * - Settings.adsEnabled = true
 * - Có googleAdsensePublisherId
 * - User đã consent (hoặc Settings.consentRequired = false)
 *
 * `next/script` strategy `afterInteractive` để không block initial render.
 * Các `<AdsenseUnit>` con sẽ `push({})` vào queue khi mount.
 */
export function AdsenseScript() {
    const { data: config } = useAdsConfig();
    const { consented } = useAdsConsent();

    if (!config?.adsEnabled) return null;
    if (!config.googleAdsensePublisherId) return null;
    if (config.consentRequired && !consented) return null;

    return (
        <Script
            id="google-adsense"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.googleAdsensePublisherId}`}
            crossOrigin="anonymous"
        />
    );
}
