'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { SiGoogleplay } from 'react-icons/si';
import { Smartphone, X } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.yeuyeu.webtruyen&pcampaignid=web_share';
const DISMISS_KEY = 'android_app_banner_dismissed';
const DISMISS_DAYS = 7;

/**
 * Banner kêu gọi cài ứng dụng Android — hiển thị toàn site (trừ /quan-tri).
 * Bỏ qua phần sidebar cố định (md:ml-60 md:w-auto) để không bị che như FooterBanner.
 * Có nút đóng, nhớ 7 ngày qua localStorage.
 */
export function AndroidAppBanner() {
    const pathname = usePathname();
    const { data: settings } = useSettings();
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        try {
            const v = localStorage.getItem(DISMISS_KEY);
            if (v) {
                const { ts } = JSON.parse(v) as { ts: number };
                if (Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
                    setDismissed(true);
                } else {
                    localStorage.removeItem(DISMISS_KEY);
                }
            }
        } catch {}
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
        } catch {}
    };

    // Tính xem FooterBanner có đang hiển thị không để tránh double mb-16 trên mobile.
    const footerBannerVisible = useMemo(() => {
        if (!pathname || pathname.startsWith('/u/') || pathname.startsWith('/quan-tri')) return false;
        if (!settings?.footerBannerEnabled) return false;
        const list = settings?.footerBannerSlides;
        const raw = Array.isArray(list) ? list.filter((s) => s && (s as any).image) : [];
        if (raw.length > 0) return true;
        return !!settings?.footerBannerImage;
    }, [pathname, settings]);

    if (!pathname || pathname.startsWith('/quan-tri')) return null;
    if (dismissed) return null;

    // Nếu FooterBanner đang hiện thì banner này không cần mb-16 (FooterBanner đã có).
    // Nếu FooterBanner ẩn thì cần mb-16 để không bị bottom nav che trên mobile.
    const marginClass = footerBannerVisible ? 'mb-0' : 'mb-16 md:mb-0';

    return (
        <div className={`w-full md:ml-60 md:w-auto ${marginClass} bg-surface-container border-t border-outline-variant/40`}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center flex-shrink-0">
                        <Smartphone size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface leading-tight">Tải ứng dụng YÊU cho Android</p>
                        <p className="text-xs text-on-surface-variant leading-tight">Đọc nhanh hơn, nhận thông báo chương mới, dùng khi offline</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white hover:bg-zinc-800 active:scale-[0.98] transition-all text-sm font-semibold shadow-sm"
                    >
                        <SiGoogleplay className="w-4 h-4 flex-shrink-0" />
                        Cài đặt trên Google Play
                    </a>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Đóng"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
