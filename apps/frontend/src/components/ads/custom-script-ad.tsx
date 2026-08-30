'use client';

import { useAdsConsent } from '@/lib/ads/consent-context';
import { useAdsConfig } from '@/lib/api/hooks/use-ads-config';
import type { Ad } from '@/lib/api/ads.service';

interface Props {
    ad: Ad;
    className?: string;
}

/**
 * Render HTML/script tuỳ ý từ admin (Adsterra, PropellerAds, MGID…) trong một
 * `<iframe srcDoc sandbox>` cách ly origin:
 *   - `sandbox` KHÔNG có `allow-same-origin` → iframe chạy ở một origin opaque,
 *     nên script ad KHÔNG đọc được cookie phiên, localStorage hay DOM của trang
 *     cha (yeuyeu.net). Nếu một ad network bị chiếm, thiệt hại giới hạn trong
 *     iframe thay vì thành XSS toàn site.
 *   - `allow-scripts` để ad vẫn chạy JS; `allow-popups`(+escape) cho click mở
 *     tab đích. KHÔNG bao giờ thêm `allow-same-origin` cạnh `allow-scripts`
 *     (sandbox sẽ tự gỡ được chính nó).
 *
 * Dùng `srcDoc` thay cho `document.write` vì khi sandbox đã cách ly origin,
 * trang cha không còn truy cập được `contentDocument`.
 */
export function CustomScriptAd({ ad, className }: Props) {
    const { data: config } = useAdsConfig();
    const { consented } = useAdsConsent();

    const html = ad.networkConfig?.html ?? '';
    const enabled =
        !!config?.adsEnabled && !!html && (!config.consentRequired || consented);

    if (!enabled) return null;

    // Wrap để iframe có CSS reset cơ bản — ads thường có style riêng.
    const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:sans-serif}</style></head><body>${html}</body></html>`;

    return (
        <iframe
            className={className}
            title="Quảng cáo"
            style={{ width: '100%', border: 0, display: 'block' }}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            srcDoc={srcDoc}
        />
    );
}
