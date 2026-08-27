'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ChapterAudioPlayerHandle } from '@/components/stories/chapter-audio-player';

interface AudioScrollSyncOptions {
    playerRef: React.RefObject<ChapterAudioPlayerHandle | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
    enabled: boolean;
    /**
     * Custom callback lấy vị trí hiện tại (ms) — dùng cho Web Speech API
     * hoặc bất kỳ nguồn audio nào không có timeupdate event.
     * Khi cung cấp, hook dùng polling (setInterval) thay vì event.
     */
    getPositionMs?: () => number;
}

interface AudioScrollSyncResult {
    activeParagraphIndex: number;
    isAutoScrolling: boolean;
}

/**
 * Hook đồng bộ cuộn + highlight đoạn văn với playback audio.
 *
 * Hỗ trợ 2 chế độ:
 * 1. Audio element (AI TTS / author audio): dùng timeupdate event
 * 2. Custom position (Web Speech API): dùng getPositionMs callback + polling
 *
 * Kiến trúc:
 * 1. Parse content HTML → mảng paragraph
 * 2. Tính duration ước tính cho mỗi đoạn dựa trên tỷ lệ text length
 * 3. Map thời gian → paragraph index
 * 4. scrollIntoView + thêm class 'audio-sync-active' vào paragraph
 */
export function useAudioScrollSync({
    playerRef,
    contentRef,
    enabled,
    getPositionMs,
}: AudioScrollSyncOptions): AudioScrollSyncResult {
    const [activeParagraphIndex, setActiveParagraphIndex] = useState(-1);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const timelineRef = useRef<{ startMs: number; endMs: number }[]>([]);
    const paragraphElsRef = useRef<Element[]>([]);
    const isAutoScrollingRef = useRef(false);
    const currentIndexRef = useRef(-1);
    const durationMsRef = useRef(0);

    /** Lấy audio element từ player handle. */
    const getAudioElement = useCallback((): HTMLAudioElement | null => {
        return playerRef.current?.getElement() ?? null;
    }, [playerRef]);

    /** Đọc text thuần từ 1 element (bỏ tag HTML). */
    const getElementText = useCallback((el: Element): string => {
        return (el.textContent || '').replace(/\u00A0/g, ' ').trim();
    }, []);

    /** Parse nội dung DOM → mảng paragraph elements + timeline. */
    const buildTimeline = useCallback((durationMs: number) => {
        const container = contentRef.current;
        if (!container) return;
        if (!durationMs || !isFinite(durationMs)) return;
        durationMsRef.current = durationMs;

        const paragraphs = Array.from(container.querySelectorAll('p'));
        const textLengths = paragraphs.map((p) => getElementText(p).length);

        const totalTextLength = textLengths.reduce((sum, len) => sum + len, 0);
        if (totalTextLength === 0 || paragraphs.length === 0) return;

        paragraphElsRef.current = paragraphs;
        timelineRef.current = paragraphs.map((_, i) => {
            const startMs = (sumUntil(textLengths, i) / totalTextLength) * durationMs;
            const endMs = ((sumUntil(textLengths, i) + textLengths[i]) / totalTextLength) * durationMs;
            return { startMs, endMs };
        });
    }, [contentRef, getElementText]);

    /**
     * Khối nội dung có thể bị React render lại SAU khi timeline đã build
     * (query ads/settings về muộn làm `dangerouslySetInnerHTML` thay toàn bộ
     * DOM) — các <p> cũ bị tháo khỏi DOM, highlight/scroll rơi vào node chết.
     * Phát hiện qua isConnected và build lại từ DOM hiện tại.
     */
    const ensureTimeline = useCallback(() => {
        const els = paragraphElsRef.current;
        if (els.length > 0 && els[0].isConnected) return;
        if (!durationMsRef.current) return;
        buildTimeline(durationMsRef.current);
        currentIndexRef.current = -1; // ép highlight lại trên node mới
    }, [buildTimeline]);

    /** Map thời gian hiện tại → paragraph index. */
    const getActiveParagraph = useCallback((currentTimeMs: number): number => {
        const timeline = timelineRef.current;
        for (let i = 0; i < timeline.length; i++) {
            if (currentTimeMs >= timeline[i].startMs && currentTimeMs < timeline[i].endMs) {
                return i;
            }
        }
        if (timeline.length > 0 && currentTimeMs >= timeline[timeline.length - 1].endMs) {
            return timeline.length - 1;
        }
        return -1;
    }, []);

    /** Cuộn mượt đến paragraph. */
    const scrollToParagraph = useCallback((el: Element) => {
        isAutoScrollingRef.current = true;
        setIsAutoScrolling(true);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            isAutoScrollingRef.current = false;
            setIsAutoScrolling(false);
        }, 800);
    }, []);

    /** Thêm/bỏ class highlight. */
    const highlightParagraph = useCallback((index: number) => {
        const paragraphs = paragraphElsRef.current;
        paragraphs.forEach((p, i) => {
            const htmlEl = p as HTMLElement;
            if (i === index) {
                if (!p.classList.contains('audio-sync-active')) {
                    p.classList.add('audio-sync-active');
                    htmlEl.dataset.audioSync = 'active';
                }
            } else {
                if (p.classList.contains('audio-sync-active')) {
                    p.classList.remove('audio-sync-active');
                    delete htmlEl.dataset.audioSync;
                }
            }
        });
    }, []);

    /** Xoá toàn bộ highlight. */
    const clearHighlights = useCallback(() => {
        paragraphElsRef.current.forEach((p) => {
            p.classList.remove('audio-sync-active');
            delete (p as HTMLElement).dataset.audioSync;
        });
        paragraphElsRef.current = [];
        timelineRef.current = [];
    }, []);

    /** Sync current time → paragraph (dùng chung cho cả 2 chế độ). */
    const syncToParagraph = useCallback((currentTimeMs: number) => {
        ensureTimeline();
        if (timelineRef.current.length === 0) return;
        const newIndex = getActiveParagraph(currentTimeMs);
        if (newIndex >= 0 && newIndex !== currentIndexRef.current) {
            currentIndexRef.current = newIndex;
            setActiveParagraphIndex(newIndex);
            highlightParagraph(newIndex);
            const el = paragraphElsRef.current[newIndex];
            if (el && !isAutoScrollingRef.current) {
                scrollToParagraph(el);
            }
        }
    }, [ensureTimeline, getActiveParagraph, highlightParagraph, scrollToParagraph]);

    // ─── Chế độ 1: Audio element (AI TTS / author audio) ───
    // Dùng timeupdate event — chính xác, không cần polling.
    useEffect(() => {
        if (getPositionMs) return; // Bỏ qua nếu dùng custom position
        const audio = getAudioElement();
        if (!enabled || !audio) return;

        const onLoadedMetadata = () => buildTimeline(audio.duration * 1000);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        if (audio.readyState >= 1) {
            buildTimeline(audio.duration * 1000);
        }

        const onTimeUpdate = () => syncToParagraph(audio.currentTime * 1000);
        const onSeeked = () => {
            ensureTimeline();
            if (timelineRef.current.length === 0) return;
            const idx = getActiveParagraph(audio.currentTime * 1000);
            currentIndexRef.current = idx;
            setActiveParagraphIndex(idx);
            highlightParagraph(idx);
        };
        const onEnded = () => {
            clearHighlights();
            setActiveParagraphIndex(-1);
            currentIndexRef.current = -1;
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('seeked', onSeeked);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('seeked', onSeeked);
            audio.removeEventListener('ended', onEnded);
            clearHighlights();
            setActiveParagraphIndex(-1);
            currentIndexRef.current = -1;
        };
    }, [enabled, getPositionMs, getAudioElement, buildTimeline, ensureTimeline, syncToParagraph, getActiveParagraph, highlightParagraph, clearHighlights]);

    // ─── Chế độ 2: Custom position (Web Speech API) ───
    // Dùng polling — Web Speech API không có timeupdate event.
    // Đọc isPlaying/totalDurationMs TRỰC TIẾP từ player handle mỗi tick:
    // truyền qua props thì giá trị bị "đóng băng" ở render cuối của component
    // cha (cha không re-render khi người dùng bấm Nghe trong player con).
    useEffect(() => {
        if (!getPositionMs || !enabled) return;

        // Poll mỗi 300ms — đủ mượt mà không đốt CPU
        const interval = setInterval(() => {
            const handle = playerRef.current;
            if (!handle?.isPlaying) return;
            const totalMs = handle.totalDurationMs;
            if (!totalMs) return;
            if (durationMsRef.current !== totalMs) buildTimeline(totalMs);
            syncToParagraph(getPositionMs());
        }, 300);

        return () => {
            clearInterval(interval);
            clearHighlights();
            setActiveParagraphIndex(-1);
            currentIndexRef.current = -1;
        };
    }, [enabled, getPositionMs, playerRef, buildTimeline, syncToParagraph, clearHighlights]);

    return { activeParagraphIndex, isAutoScrolling };
}

/** Tổng các phần tử từ 0 đến i-1 (không tính i). */
function sumUntil(arr: number[], i: number): number {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += arr[j];
    return sum;
}
