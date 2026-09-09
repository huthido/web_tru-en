'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

/**
 * Bottom sheet cho mobile: trượt từ đáy lên, chạm nền/ESC để đóng, khoá cuộn
 * body khi mở. z-index cao hơn bottom nav (z-50) để phủ lên thanh điều hướng.
 * Desktop hiếm khi dùng nhưng vẫn hoạt động (canh giữa, bo góc 4 cạnh).
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
            {/* Nền mờ */}
            <button
                type="button"
                aria-label="Đóng"
                onClick={onClose}
                className="absolute inset-0 w-full h-full bg-black/50 animate-in fade-in duration-200"
            />
            {/* Bảng trượt */}
            <div className="absolute bottom-0 left-0 right-0 md:left-1/2 md:right-auto md:bottom-1/2 md:-translate-x-1/2 md:translate-y-1/2 md:w-[420px] max-h-[85vh] flex flex-col bg-surface-container rounded-t-3xl md:rounded-3xl shadow-2xl border-t border-outline-variant/40 animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="relative flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
                    <span className="mx-auto md:hidden absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-outline-variant" />
                    {title ? (
                        <h2 className="font-display text-base font-bold text-on-surface mt-2">{title}</h2>
                    ) : (
                        <span />
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="mt-2 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto px-4 pb-5">{children}</div>
            </div>
        </div>
    );
}
