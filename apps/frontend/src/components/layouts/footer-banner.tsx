'use client';

import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/api/hooks/use-settings';

/**
 * Banner ảnh ở đáy trang — thay cho footer trên MỌI trang (khi admin bật
 * Settings.footerBannerEnabled). Ẩn ở:
 *  - Trang cá nhân /u/... : giữ footer chữ cũ (do ProfileLayout render).
 *  - Khu quản trị /quan-tri : không hiện banner quảng bá trong admin.
 * Đặt trong root layout nên tự áp cho tất cả trang, không cần nhúng từng trang.
 */
export function FooterBanner() {
    const pathname = usePathname();
    const { data: settings } = useSettings();

    if (!pathname || pathname.startsWith('/u/') || pathname.startsWith('/quan-tri')) {
        return null;
    }
    if (!settings?.footerBannerEnabled || !settings?.footerBannerImage) {
        return null;
    }

    const banner = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={settings.footerBannerImage}
            alt={settings.siteName || 'Banner'}
            className="w-full h-auto block"
            loading="lazy"
        />
    );

    return (
        // mb-16 md:mb-0: chừa chỗ cho thanh điều hướng dưới cùng (fixed h-16) trên mobile.
        <div className="w-full mb-16 md:mb-0 bg-surface-container border-t border-outline-variant/40">
            {settings.footerBannerLink ? (
                <a
                    href={settings.footerBannerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-opacity hover:opacity-90"
                >
                    {banner}
                </a>
            ) : (
                banner
            )}
        </div>
    );
}
