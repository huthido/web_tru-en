'use client';

import { useEffect, useRef } from 'react';
import { useAdsConsent } from '@/lib/ads/consent-context';
import { useAdsConfig } from '@/lib/api/hooks/use-ads-config';
import type { Ad } from '@/lib/api/ads.service';

interface Props {
    ad: Ad;
    className?: string;
}

/**
 * Render HTML/script tuỳ ý từ admin (Adsterra, PropellerAds, MGID…). Sandboxed
 * trong `<iframe srcdoc>` để:
 *   - Cô lập script khỏi main document (giảm rủi ro XSS vào app state).
 *   - Cho script chạy bình thường (KHÔNG `sandbox` attribute → một số ad
 *     network cần `document.write` + cookie cùng domain). Trade-off bảo mật:
 *     chỉ admin authenticated mới tạo được loại này, và iframe vẫn cách ly DOM.
 *
 * Nếu cần thắt chặt hơn nữa, thêm attribute `sandbox="allow-scripts allow-popups"`
 * — nhưng nhiều ad network sẽ fail. Cân nhắc khi enable.
 */
export function CustomScriptAd({ ad, className }: Props) {
    const { data: config } = useAdsConfig();
    const { consented } = useAdsConsent();
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const html = ad.networkConfig?.html ?? '';
    const enabled =
        !!config?.adsEnabled && !!html && (!config.consentRequired || consented);

    useEffect(() => {
        if (!enabled || !iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc) return;
        doc.open();
        // Wrap để iframe có CSS reset cơ bản — ads thường có style riêng.
        doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:sans-serif}</style></head><body>${html}</body></html>`);
        doc.close();
    }, [enabled, html]);

    if (!enabled) return null;

    return (
        <iframe
            ref={iframeRef}
            className={className}
            title="Quảng cáo"
            style={{ width: '100%', border: 0, display: 'block' }}
            // KHÔNG dùng srcDoc prop của React vì 1 số script ad cần doc.write
            // sau khi iframe load — write trực tiếp qua contentDocument linh hoạt hơn.
        />
    );
}
