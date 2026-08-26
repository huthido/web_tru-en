'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/api/hooks/use-settings';
import type { FooterBannerSlide } from '@/lib/api/settings.service';

/**
 * Banner ảnh ở đáy trang — hiện ở MỌI trang khi admin bật Settings.footerBannerEnabled.
 * Hỗ trợ SLIDESHOW nhiều ảnh (footerBannerSlides): >1 ảnh thì tự chạy slide,
 * mỗi ảnh có thể có link riêng. Ẩn ở:
 *  - Trang cá nhân /u/... : giữ footer chữ cũ (ProfileLayout render).
 *  - Khu quản trị /quan-tri : không hiện banner quảng bá trong admin.
 * Đặt trong root layout nên tự áp cho tất cả trang.
 */
export function FooterBanner() {
    const pathname = usePathname();
    const { data: settings } = useSettings();
    const [idx, setIdx] = useState(0);

    // Danh sách slide: ưu tiên mảng slides; fallback ảnh đơn cũ (tương thích).
    const slides: FooterBannerSlide[] = useMemo(() => {
        const list = settings?.footerBannerSlides;
        const raw = Array.isArray(list) ? list.filter((s) => s && s.image) : [];
        if (raw.length) return raw;
        if (settings?.footerBannerImage) {
            return [{ image: settings.footerBannerImage, link: settings.footerBannerLink || undefined }];
        }
        return [];
    }, [settings]);

    // Về slide đầu khi số lượng đổi.
    useEffect(() => { setIdx(0); }, [slides.length]);

    // Tự chạy slide khi có >1 ảnh.
    useEffect(() => {
        if (slides.length <= 1) return;
        const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500);
        return () => clearInterval(t);
    }, [slides.length]);

    if (!pathname || pathname.startsWith('/u/') || pathname.startsWith('/quan-tri')) return null;
    if (!settings?.footerBannerEnabled || slides.length === 0) return null;

    const cur = slides[Math.min(idx, slides.length - 1)];
    const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={cur.image}
            alt={settings.siteName || 'Banner'}
            className="w-full h-auto block"
            loading="lazy"
        />
    );

    return (
        // mb-16 md:mb-0: chừa chỗ cho thanh điều hướng dưới cùng (fixed h-16) trên mobile.
        <div className="w-full mb-16 md:mb-0 bg-surface-container border-t border-outline-variant/40">
            <div className="relative">
                {cur.link ? (
                    <a
                        href={cur.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block transition-opacity hover:opacity-90"
                    >
                        {img}
                    </a>
                ) : (
                    img
                )}

                {/* Preload các ảnh còn lại để đổi slide không nháy. */}
                {slides.length > 1 &&
                    slides.map((s, i) =>
                        i === idx ? null : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={s.image} alt="" aria-hidden="true" className="hidden" loading="lazy" />
                        ),
                    )}

                {/* Chấm chỉ báo + bấm để chuyển slide. */}
                {slides.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Ảnh ${i + 1}`}
                                onClick={() => setIdx(i)}
                                className={`h-2 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'}`}
                                style={{ boxShadow: '0 0 3px rgba(0,0,0,0.45)' }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
