'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/api/hooks/use-settings';
import type { FooterBannerSlide } from '@/lib/api/settings.service';

const SLIDE_MS = 4500; // thời gian mỗi ảnh hiển thị
const ANIM_MS = 600; // thời gian hiệu ứng trượt

/**
 * Banner ảnh ở đáy trang — slideshow nhiều ảnh (footerBannerSlides). Khung CỐ
 * ĐỊNH tỉ lệ 3:1 (1500×500), ảnh nằm GỌN trong khung (object-contain, không méo
 * / không tràn). Nhiều ảnh → tự trượt từ phải qua trái (vòng lặp liền mạch nhờ
 * clone ảnh đầu). Ẩn ở /u/* (trang cá nhân giữ footer chữ) và /quan-tri (admin).
 * Khung dùng padding-bottom (không dùng CSS aspect-ratio) để chạy cả iOS 12.
 */
export function FooterBanner() {
    const pathname = usePathname();
    const { data: settings } = useSettings();
    const [idx, setIdx] = useState(0);
    const [animate, setAnimate] = useState(true);

    const slides: FooterBannerSlide[] = useMemo(() => {
        const list = settings?.footerBannerSlides;
        const raw = Array.isArray(list) ? list.filter((s) => s && s.image) : [];
        if (raw.length) return raw;
        if (settings?.footerBannerImage) {
            return [{ image: settings.footerBannerImage, link: settings.footerBannerLink || undefined }];
        }
        return [];
    }, [settings]);

    const many = slides.length > 1;

    // Về đầu khi danh sách đổi.
    useEffect(() => { setIdx(0); setAnimate(true); }, [slides.length]);

    // Tự trượt sang trái (idx tăng → track dịch trái).
    useEffect(() => {
        if (!many) return;
        const t = setInterval(() => setIdx((i) => i + 1), SLIDE_MS);
        return () => clearInterval(t);
    }, [many]);

    // Vòng lặp liền mạch: tới ảnh clone (idx === length) → sau khi trượt xong,
    // tắt hiệu ứng và nhảy về 0 (trùng hình clone), rồi bật lại hiệu ứng.
    useEffect(() => {
        if (!many) return;
        if (idx === slides.length) {
            const t = setTimeout(() => { setAnimate(false); setIdx(0); }, ANIM_MS);
            return () => clearTimeout(t);
        }
        if (idx === 0 && !animate) {
            const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
            return () => cancelAnimationFrame(r);
        }
    }, [idx, slides.length, animate, many]);

    if (!pathname || pathname.startsWith('/u/') || pathname.startsWith('/quan-tri')) return null;
    if (!settings?.footerBannerEnabled || slides.length === 0) return null;

    const track = many ? [...slides, slides[0]] : slides;
    const activeIdx = many ? idx % slides.length : 0;

    const renderSlide = (s: FooterBannerSlide, key: number) => {
        const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={s.image}
                alt={settings.siteName || 'Banner'}
                className="w-full h-full object-contain"
                loading="lazy"
            />
        );
        return (
            <div key={key} className="flex-shrink-0 h-full" style={{ width: '100%' }}>
                {s.link ? (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full transition-opacity hover:opacity-90">
                        {img}
                    </a>
                ) : (
                    img
                )}
            </div>
        );
    };

    return (
        // mb-16 md:mb-0: chừa chỗ cho thanh điều hướng dưới cùng (fixed h-16) trên mobile.
        <div className="w-full mb-16 md:mb-0 bg-surface-container border-t border-outline-variant/40">
            {/* Khung cố định 3:1 (1500×500), tối đa 1500px, căn giữa. */}
            <div className="relative w-full mx-auto overflow-hidden" style={{ maxWidth: 1500 }}>
                {/* Spacer giữ tỉ lệ 500/1500 = 33.3333% (không dùng aspect-ratio để hợp iOS 12). */}
                <div style={{ paddingBottom: '33.3333%' }} />
                <div
                    className="absolute inset-0 flex"
                    style={{
                        transform: `translateX(-${idx * 100}%)`,
                        transition: animate ? `transform ${ANIM_MS}ms ease` : 'none',
                    }}
                >
                    {track.map((s, i) => renderSlide(s, i))}
                </div>

                {/* Chấm chỉ báo. */}
                {many && (
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Ảnh ${i + 1}`}
                                onClick={() => { setAnimate(true); setIdx(i); }}
                                className={`h-2 rounded-full transition-all ${i === activeIdx ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'}`}
                                style={{ boxShadow: '0 0 3px rgba(0,0,0,0.45)' }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
