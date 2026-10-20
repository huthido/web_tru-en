'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Cài đặt khung đọc chương, lưu localStorage để giữ giữa các chương / lần
 * mở sau. Không lưu được (private mode, bị chặn) thì vẫn chạy với mặc định.
 */
export type ReaderFont = 'quicksand' | 'serif' | 'sans';
export type ReaderWidth = 'narrow' | 'normal' | 'wide';
export type ReaderTheme = 'auto' | 'paper' | 'sepia' | 'night';

export interface ReaderSettings {
    fontSize: number;
    font: ReaderFont;
    lineHeight: number;
    width: ReaderWidth;
    theme: ReaderTheme;
}

export const READER_DEFAULTS: ReaderSettings = {
    fontSize: 16,
    font: 'quicksand',
    // = leading-relaxed (giá trị cũ của khung đọc) để mặc định nhìn y như trước
    lineHeight: 1.625,
    width: 'normal',
    theme: 'auto',
};

export const READER_FONT_SIZE = { min: 12, max: 28, step: 2 };
export const READER_LINE_HEIGHTS = [1.5, 1.625, 1.8, 2];

export const READER_FONTS: { value: ReaderFont; label: string; css: string }[] = [
    { value: 'quicksand', label: 'Mềm', css: 'var(--font-quicksand), Quicksand, sans-serif' },
    // Font hệ thống có sẵn dấu tiếng Việt — không tải thêm webfont.
    { value: 'serif', label: 'Có chân', css: "'Noto Serif', 'Times New Roman', Times, serif" },
    { value: 'sans', label: 'Không chân', css: 'var(--font-body), Inter, Arial, sans-serif' },
];

export const READER_WIDTHS: { value: ReaderWidth; label: string; maxWidth: string }[] = [
    { value: 'narrow', label: 'Hẹp', maxWidth: '640px' },
    { value: 'normal', label: 'Vừa', maxWidth: '56rem' }, // = max-w-4xl cũ
    { value: 'wide', label: 'Rộng', maxWidth: 'none' },
];

/** auto = theo giao diện sáng/tối của site; còn lại là màu nền cố định. */
export const READER_THEMES: { value: ReaderTheme; label: string; bg?: string; fg?: string }[] = [
    { value: 'auto', label: 'Mặc định' },
    { value: 'paper', label: 'Giấy trắng', bg: '#ffffff', fg: '#1f1f1f' },
    { value: 'sepia', label: 'Sepia', bg: '#f4ecd8', fg: '#5b4636' },
    { value: 'night', label: 'Ban đêm', bg: '#121212', fg: '#c9c9c9' },
];

const STORAGE_KEY = 'yeu-reader-settings';

function sanitize(raw: any): ReaderSettings {
    const s = { ...READER_DEFAULTS };
    if (!raw || typeof raw !== 'object') return s;
    const size = Number(raw.fontSize);
    if (size >= READER_FONT_SIZE.min && size <= READER_FONT_SIZE.max) s.fontSize = size;
    if (READER_FONTS.some((f) => f.value === raw.font)) s.font = raw.font;
    if (READER_LINE_HEIGHTS.indexOf(Number(raw.lineHeight)) !== -1) s.lineHeight = Number(raw.lineHeight);
    if (READER_WIDTHS.some((w) => w.value === raw.width)) s.width = raw.width;
    if (READER_THEMES.some((t) => t.value === raw.theme)) s.theme = raw.theme;
    return s;
}

export function useReaderSettings() {
    const [settings, setSettings] = useState<ReaderSettings>(READER_DEFAULTS);

    // Đọc sau khi mount (tránh lệch HTML server/client).
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setSettings(sanitize(JSON.parse(raw)));
        } catch { /* private mode */ }
    }, []);

    const update = useCallback((patch: Partial<ReaderSettings>) => {
        setSettings((prev) => {
            const next = sanitize({ ...prev, ...patch });
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch { /* private mode */ }
            return next;
        });
    }, []);

    const reset = useCallback(() => update(READER_DEFAULTS), [update]);

    return { settings, update, reset };
}
