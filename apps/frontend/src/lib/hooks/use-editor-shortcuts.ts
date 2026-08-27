import { useEffect, useRef } from 'react';

export interface EditorShortcutHandlers {
    /** Ctrl/Cmd+S hoặc Ctrl/Cmd+Enter */
    onSave?: () => void;
    /** Alt+N hoặc Ctrl+M — tạo chương mới */
    onNew?: () => void;
    /** Alt+L — về danh sách chương */
    onList?: () => void;
}

/**
 * Phím tắt cho trình soạn thảo chương. Gắn listener ở window 1 lần; dùng ref để
 * luôn gọi callback mới nhất dù component re-render. KHÔNG dùng requestSubmit
 * (iOS 12 chưa hỗ trợ) — gọi thẳng handler lưu.
 */
export function useEditorShortcuts(handlers: EditorShortcutHandlers) {
    const ref = useRef(handlers);
    ref.current = handlers;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const mod = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            if (mod && !e.altKey && !e.shiftKey && (key === 's' || key === 'enter')) {
                e.preventDefault();
                ref.current.onSave?.();
            } else if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && key === 'm') {
                // Ctrl+M — chỉ ctrlKey (tránh Cmd+M = thu nhỏ cửa sổ trên Mac).
                e.preventDefault();
                ref.current.onNew?.();
            } else if (e.altKey && !mod && !e.shiftKey && key === 'n') {
                e.preventDefault();
                ref.current.onNew?.();
            } else if (e.altKey && !mod && !e.shiftKey && key === 'l') {
                e.preventDefault();
                ref.current.onList?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
}

/** Gợi ý phím tắt hiển thị cho người dùng. */
export const EDITOR_SHORTCUT_HINT = 'Ctrl/⌘+S: lưu · Alt+N/Ctrl+M: chương mới · Alt+L: danh sách';
