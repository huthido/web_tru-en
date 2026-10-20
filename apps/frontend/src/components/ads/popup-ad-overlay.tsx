'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { shouldUnoptimizeImage, ImageSizes } from '@/utils/image-utils';
import { useTrackAdView, useTrackAdClick } from '@/lib/api/hooks/use-ads';

/** Số giây phải chờ trước khi đóng được quảng cáo. */
const CLOSE_DELAY_S = 3;

interface Props {
    ad: { id: string; imageUrl: string; linkUrl?: string | null; title?: string | null };
    onClose: () => void;
}

/**
 * Quảng cáo popup hiện thành lớp phủ NGAY TRÊN trang đọc (trước đây chuyển
 * hẳn sang /xem-quang-cao rồi quay lại → mất chỗ đang đọc, rối nút Back).
 * Ghi lượt xem khi hiện, lượt click khi bấm ảnh; nút đóng mở sau vài giây.
 */
export function PopupAdOverlay({ ad, onClose }: Props) {
    const trackView = useTrackAdView();
    const trackClick = useTrackAdClick();
    const [remaining, setRemaining] = useState(CLOSE_DELAY_S);
    const trackedRef = useRef<string | null>(null);

    useEffect(() => {
        if (trackedRef.current === ad.id) return;
        trackedRef.current = ad.id;
        trackView.mutate(ad.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ad.id]);

    useEffect(() => {
        if (remaining <= 0) return;
        const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
        return () => clearTimeout(t);
    }, [remaining]);

    // Khoá cuộn nền khi đang hiện; ESC đóng khi đã được phép.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && remaining <= 0) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [remaining, onClose]);

    const canClose = remaining <= 0;
    const image = (
        <div className="relative w-full aspect-square bg-surface-container-high">
            <OptimizedImage
                src={ad.imageUrl}
                alt={ad.title || 'Quảng cáo'}
                fill
                objectFit="contain"
                sizes={ImageSizes.adFull}
                quality={90}
                priority
                unoptimized={shouldUnoptimizeImage(ad.imageUrl)}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Quảng cáo">
            <div className="absolute inset-0 bg-black/70 animate-in fade-in duration-200" />
            <div className="relative w-full max-w-sm md:max-w-md bg-surface-container rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs font-medium text-on-surface-variant">Được tài trợ</span>
                    <button
                        type="button"
                        onClick={canClose ? onClose : undefined}
                        disabled={!canClose}
                        aria-label={canClose ? 'Đóng quảng cáo' : `Đóng sau ${remaining} giây`}
                        className="min-w-[32px] h-8 px-2 rounded-full flex items-center justify-center text-sm font-semibold text-on-surface-variant bg-surface-container-high disabled:cursor-default"
                    >
                        {canClose ? <X size={18} /> : remaining}
                    </button>
                </div>
                {ad.linkUrl ? (
                    <a
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="block"
                        onClick={() => trackClick.mutate(ad.id)}
                    >
                        {image}
                    </a>
                ) : (
                    image
                )}
                <div className="p-3">
                    <button
                        type="button"
                        onClick={canClose ? onClose : undefined}
                        disabled={!canClose}
                        className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-60 transition-opacity"
                    >
                        {canClose ? 'Tiếp tục đọc' : `Tiếp tục đọc sau ${remaining}s`}
                    </button>
                </div>
            </div>
        </div>
    );
}
