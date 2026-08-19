'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Pause, Play, Square } from 'lucide-react';

interface ChapterAudioPlayerProps {
    /** URL file audio tác giả tải lên; null/undefined = dùng text-to-speech. */
    audioUrl?: string | null;
    /** Nội dung chương (HTML) — nguồn cho text-to-speech. */
    content: string;
    /** Ngôn ngữ của truyện (BCP-47, vd 'vi-VN') — lọc danh sách giọng theo
     *  ngôn ngữ này. null/undefined = không lọc. Xem countryToTtsLang(). */
    preferredLang?: string | null;
}

/**
 * Map `Story.country` → ngôn ngữ giọng TTS. Truyện không có field language
 * riêng nên dùng country làm tín hiệu; truyện dịch vẫn chọn lại được giọng
 * khác qua nút "Hiện tất cả giọng".
 */
const COUNTRY_TO_LANG: Record<string, string> = {
    VN: 'vi-VN',
    CN: 'zh-CN',
    KR: 'ko-KR',
    JP: 'ja-JP',
    US: 'en-US',
};

export function countryToTtsLang(country?: string | null): string | null {
    if (!country) return null;
    return COUNTRY_TO_LANG[country.toUpperCase()] || null;
}

/** Bóc HTML thành text thuần cho TTS. */
function toPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

/**
 * Chia text thành đoạn ngắn (~250 ký tự, cắt theo câu) vì Chrome tự dừng
 * các utterance quá dài. Đọc lần lượt từng đoạn.
 */
function splitIntoChunks(text: string, maxLen = 250): string[] {
    // Không dùng regex lookbehind — iOS 12 Safari sẽ lỗi cú pháp lúc parse.
    const sentences = (text.match(/[^.!?…。\n]+[.!?…。]*\s*/g) || [text])
        .map((s) => s.trim())
        .filter(Boolean);
    const chunks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
        if (current && current.length + sentence.length + 1 > maxLen) {
            chunks.push(current);
            current = sentence;
        } else {
            current = current ? `${current} ${sentence}` : sentence;
        }
        // Câu đơn lẻ quá dài: cắt cứng theo maxLen
        while (current.length > maxLen) {
            chunks.push(current.slice(0, maxLen));
            current = current.slice(maxLen);
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

type TtsState = 'idle' | 'playing' | 'paused';

const TTS_RATES = [0.75, 1, 1.25, 1.5];
const TTS_VOICE_STORAGE_KEY = 'yeu-tts-voice';

/** So khớp giọng với ngôn ngữ theo mã 2 chữ đầu ('vi-VN' khớp 'vi'). */
function matchesLang(v: SpeechSynthesisVoice, lang: string): boolean {
    return !!v.lang && v.lang.toLowerCase().slice(0, 2) === lang.toLowerCase().slice(0, 2);
}

function isVietnameseVoice(v: SpeechSynthesisVoice): boolean {
    return matchesLang(v, 'vi');
}

/** Rút gọn tên giọng cho dropdown (bỏ prefix hãng + suffix ngôn ngữ dài). */
function voiceLabel(v: SpeechSynthesisVoice): string {
    const name = v.name
        .replace(/^(Microsoft|Google|Apple)\s+/i, '')
        .replace(/\s+-\s+.*$/, '');
    return `${name} (${v.lang})`;
}

/**
 * Khối "Nghe chương này" trên trang đọc:
 * - Tác giả có tải audio → phát file đó bằng <audio>.
 * - Không có audio → đọc nội dung chương bằng Web Speech API (giọng vi-VN
 *   nếu thiết bị có). Trình duyệt không hỗ trợ TTS thì ẩn hẳn khối này.
 */
export function ChapterAudioPlayer({ audioUrl, content, preferredLang }: ChapterAudioPlayerProps) {
    const [ttsSupported, setTtsSupported] = useState(false);
    const [ttsState, setTtsState] = useState<TtsState>('idle');
    const [rate, setRate] = useState(1);
    const [progress, setProgress] = useState(0); // 0-100 theo số đoạn đã đọc
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voiceURI, setVoiceURI] = useState('');
    // Tắt lọc theo ngôn ngữ truyện (truyện dịch muốn nghe giọng Việt...)
    const [showAllVoices, setShowAllVoices] = useState(false);

    const chunksRef = useRef<string[]>([]);
    const chunkIndexRef = useRef(0);
    const stoppedRef = useRef(false);
    const rateRef = useRef(1);
    rateRef.current = rate;
    const voiceURIRef = useRef('');
    voiceURIRef.current = voiceURI;

    useEffect(() => {
        const supported =
            typeof window !== 'undefined' &&
            'speechSynthesis' in window &&
            typeof window.SpeechSynthesisUtterance !== 'undefined';
        setTtsSupported(supported);
        if (!supported) return;

        // Nạp danh sách giọng — Chrome trả rỗng lần đầu rồi bắn voiceschanged.
        // Sắp xếp: giọng khớp ngôn ngữ truyện → giọng Việt → còn lại theo tên.
        const loadVoices = () => {
            const list = window.speechSynthesis.getVoices();
            if (list.length === 0) return;
            const rank = (v: SpeechSynthesisVoice) =>
                preferredLang && matchesLang(v, preferredLang) ? 0 : isVietnameseVoice(v) ? 1 : 2;
            setVoices([...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)));
        };
        loadVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
        };
    }, [preferredLang]);

    // Danh sách giọng hiển thị: lọc theo ngôn ngữ truyện, trừ khi người dùng
    // bấm "Hiện tất cả giọng" hoặc thiết bị không có giọng nào khớp.
    const visibleVoices = useMemo(() => {
        if (!preferredLang || showAllVoices) return voices;
        const filtered = voices.filter((v) => matchesLang(v, preferredLang));
        return filtered.length > 0 ? filtered : voices;
    }, [voices, preferredLang, showAllVoices]);

    // Có giọng ngoài bộ lọc không → mới cần nút bật/tắt "tất cả giọng".
    const hasHiddenVoices =
        !!preferredLang &&
        voices.some((v) => !matchesLang(v, preferredLang)) &&
        voices.some((v) => matchesLang(v, preferredLang));

    // Giữ lựa chọn hợp lệ khi danh sách hiển thị đổi: ưu tiên giọng đã lưu
    // (nếu còn trong danh sách), không thì giọng đầu tiên.
    useEffect(() => {
        if (visibleVoices.length === 0) return;
        if (voiceURI && visibleVoices.some((v) => v.voiceURI === voiceURI)) return;
        let saved = '';
        try {
            saved = localStorage.getItem(TTS_VOICE_STORAGE_KEY) || '';
        } catch { /* private mode */ }
        const next =
            (saved && visibleVoices.find((v) => v.voiceURI === saved)) || visibleVoices[0];
        setVoiceURI(next.voiceURI);
        voiceURIRef.current = next.voiceURI;
    }, [visibleVoices, voiceURI]);

    const stopTts = useCallback(() => {
        stoppedRef.current = true;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        chunkIndexRef.current = 0;
        setTtsState('idle');
        setProgress(0);
    }, []);

    // Đổi chương / rời trang → dừng đọc.
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, [content]);

    const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
        const list = window.speechSynthesis.getVoices();
        return (
            list.find((v) => v.voiceURI === voiceURIRef.current) ||
            (preferredLang ? list.find((v) => matchesLang(v, preferredLang)) : undefined) ||
            list.find(isVietnameseVoice) ||
            null
        );
    }, [preferredLang]);

    const speakFrom = useCallback((index: number) => {
        const chunks = chunksRef.current;
        if (index >= chunks.length) {
            stopTts();
            return;
        }
        chunkIndexRef.current = index;
        setProgress(Math.round((index / chunks.length) * 100));

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = rateRef.current;
        const voice = pickVoice();
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || preferredLang || 'vi-VN';
        } else {
            utterance.lang = preferredLang || 'vi-VN';
        }

        utterance.onend = () => {
            if (stoppedRef.current) return;
            speakFrom(index + 1);
        };
        utterance.onerror = () => {
            if (stoppedRef.current) return;
            // Lỗi 1 đoạn (voice bị ngắt...) → thử đoạn kế tiếp thay vì chết hẳn.
            speakFrom(index + 1);
        };

        window.speechSynthesis.speak(utterance);
    }, [pickVoice, stopTts]);

    const startTts = useCallback(() => {
        const text = toPlainText(content);
        if (!text) return;

        window.speechSynthesis.cancel();
        stoppedRef.current = false;
        chunksRef.current = splitIntoChunks(text);
        setTtsState('playing');

        // getVoices() có thể rỗng ở lần gọi đầu (Chrome nạp voice bất đồng bộ).
        if (window.speechSynthesis.getVoices().length === 0) {
            const onVoices = () => {
                window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
                if (!stoppedRef.current) speakFrom(0);
            };
            window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
            // Fallback nếu voiceschanged không bao giờ bắn
            setTimeout(() => {
                window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
                if (!stoppedRef.current && !window.speechSynthesis.speaking) speakFrom(0);
            }, 300);
        } else {
            speakFrom(0);
        }
    }, [content, speakFrom]);

    const pauseTts = useCallback(() => {
        window.speechSynthesis.pause();
        setTtsState('paused');
    }, []);

    const resumeTts = useCallback(() => {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        } else {
            // Utterance cũ đã bị huỷ (vd đổi giọng lúc tạm dừng) → đọc lại
            // đoạn hiện tại với cài đặt mới.
            stoppedRef.current = false;
            speakFrom(chunkIndexRef.current);
        }
        setTtsState('playing');
    }, [speakFrom]);

    /**
     * Áp giọng/tốc độ mới giữa chừng: utterance đang chạy không đổi được,
     * phải cancel rồi đọc lại đoạn hiện tại. cancel() kích hoạt onend/onerror
     * của utterance cũ — chặn chuỗi đọc tiếp bằng cờ stoppedRef.
     */
    const applySettingsChange = useCallback(() => {
        if (ttsState === 'playing') {
            window.speechSynthesis.cancel();
            stoppedRef.current = true;
            setTimeout(() => {
                stoppedRef.current = false;
                speakFrom(chunkIndexRef.current);
            }, 50);
        } else if (ttsState === 'paused') {
            // Huỷ utterance cũ; bấm "Tiếp tục" sẽ đọc lại đoạn này (resumeTts).
            window.speechSynthesis.cancel();
            stoppedRef.current = true;
        }
    }, [ttsState, speakFrom]);

    const changeRate = useCallback((newRate: number) => {
        setRate(newRate);
        rateRef.current = newRate;
        applySettingsChange();
    }, [applySettingsChange]);

    const changeVoice = useCallback((uri: string) => {
        setVoiceURI(uri);
        voiceURIRef.current = uri;
        try {
            localStorage.setItem(TTS_VOICE_STORAGE_KEY, uri);
        } catch { /* private mode */ }
        applySettingsChange();
    }, [applySettingsChange]);

    // --- Trường hợp 1: có file audio của tác giả ---
    if (audioUrl) {
        return (
            <div className="mb-6 p-4 bg-surface-container rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-on-surface">
                    <Headphones size={18} className="text-primary" />
                    <span>Nghe chương này</span>
                    <span className="text-xs font-normal text-on-surface-variant">(audio do tác giả tải lên)</span>
                </div>
                <audio controls preload="metadata" src={audioUrl} className="w-full">
                    Trình duyệt không hỗ trợ phát audio.
                </audio>
            </div>
        );
    }

    // --- Trường hợp 2: text-to-speech ---
    if (!ttsSupported) return null;

    return (
        <div className="mb-6 p-4 bg-surface-container rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                    <Headphones size={18} className="text-primary" />
                    <span>Nghe chương này</span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {ttsState === 'idle' && (
                        <button
                            onClick={startTts}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-full text-sm font-medium transition-colors"
                        >
                            <Play size={15} />
                            Nghe
                        </button>
                    )}
                    {ttsState === 'playing' && (
                        <button
                            onClick={pauseTts}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-full text-sm font-medium transition-colors"
                        >
                            <Pause size={15} />
                            Tạm dừng
                        </button>
                    )}
                    {ttsState === 'paused' && (
                        <button
                            onClick={resumeTts}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-full text-sm font-medium transition-colors"
                        >
                            <Play size={15} />
                            Tiếp tục
                        </button>
                    )}
                    {ttsState !== 'idle' && (
                        <button
                            onClick={stopTts}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-full text-sm transition-colors"
                            aria-label="Dừng đọc"
                        >
                            <Square size={14} />
                        </button>
                    )}

                    {visibleVoices.length > 0 && (
                        <select
                            value={voiceURI}
                            onChange={(e) => changeVoice(e.target.value)}
                            className="max-w-[180px] px-2 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface truncate"
                            aria-label="Giọng đọc"
                            title="Giọng đọc"
                        >
                            {visibleVoices.map((v) => (
                                <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>
                            ))}
                        </select>
                    )}

                    <select
                        value={rate}
                        onChange={(e) => changeRate(Number(e.target.value))}
                        className="px-2 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface"
                        aria-label="Tốc độ đọc"
                    >
                        {TTS_RATES.map((r) => (
                            <option key={r} value={r}>{r}x</option>
                        ))}
                    </select>
                </div>
            </div>

            {ttsState !== 'idle' && (
                <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <p className="mt-2 text-xs text-on-surface-variant">
                {hasHiddenVoices && !showAllVoices
                    ? 'Giọng đọc được lọc theo ngôn ngữ của truyện.'
                    : 'Đọc bằng giọng đọc của thiết bị (danh sách giọng phụ thuộc thiết bị/trình duyệt).'}
                {hasHiddenVoices && (
                    <button
                        type="button"
                        onClick={() => setShowAllVoices((s) => !s)}
                        className="ml-1.5 text-primary hover:underline"
                    >
                        {showAllVoices ? 'Chỉ hiện giọng phù hợp' : 'Hiện tất cả giọng'}
                    </button>
                )}
            </p>
        </div>
    );
}
