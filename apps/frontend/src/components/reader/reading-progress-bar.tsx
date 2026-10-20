'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Vạch tiến độ mảnh trên cùng màn hình — % nội dung chương đã cuộn qua.
 * Cập nhật thẳng style qua ref (requestAnimationFrame) để không re-render
 * cả trang đọc mỗi lần cuộn.
 */
export function ReadingProgressBar({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const el = targetRef.current;
            const bar = barRef.current;
            if (!el || !bar) return;
            const rect = el.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            const pct = total <= 0
                ? (rect.top <= 0 ? 100 : 0)
                : Math.min(100, Math.max(0, (-rect.top / total) * 100));
            bar.style.transform = `scaleX(${pct / 100})`;
        };
        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [targetRef]);

    return (
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none" aria-hidden="true">
            <div
                ref={barRef}
                className="h-full bg-primary origin-left"
                style={{ transform: 'scaleX(0)', transition: 'transform 80ms linear' }}
            />
        </div>
    );
}
