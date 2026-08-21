'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Loader2, Pause, Play, Sparkles, Square } from 'lucide-react';
import { chaptersService, type TtsAudioStatus } from '@/lib/api/chapters.service';
import { stripTtsEmotionTags } from '@/utils/tts-emotion';

interface ChapterAudioPlayerProps {
    /** URL file audio tác giả tải lên; null/undefined = dùng text-to-speech. */
    audioUrl?: string | null;
    /** Nội dung chương (HTML) — nguồn cho text-to-speech. */
    content: string;
    /** Ngôn ngữ của truyện (BCP-47, vd 'vi-VN') — lọc danh sách giọng theo
     *  ngôn ngữ này. null/undefined = không lọc. Xem countryToTtsLang(). */
    preferredLang?: string | null;
    /** Id chương — cần cho tính năng giọng đọc AI (yêu cầu sinh + poll). */
    chapterId?: string;
    /** URL audio AI (VieNeu-TTS) server đã sinh sẵn. */
    ttsAudioUrl?: string | null;
    /** Trạng thái job sinh audio AI lúc load trang. */
    ttsAudioStatus?: TtsAudioStatus | null;
    /** User là TÁC GIẢ truyện/admin + chương miễn phí không khoá → hiện nút
     *  "Tạo giọng đọc AI". Độc giả thường không có nút này (audio dùng chung,
     *  quyền tạo thuộc chủ truyện). */
    canRequestTts?: boolean;
    /** User là tác giả truyện/admin → được sinh LẠI audio AI (đổi giọng). */
    canRegenerateTts?: boolean;
    /** Admin bật cho phép tải xuống audio (Settings.chapterAudioDownloadEnabled).
     *  false = ẩn nút download của player (chặn mềm). */
    allowDownload?: boolean;
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
export function ChapterAudioPlayer({
    audioUrl,
    content,
    preferredLang,
    chapterId,
    ttsAudioUrl,
    ttsAudioStatus,
    canRequestTts,
    canRegenerateTts,
    allowDownload,
}: ChapterAudioPlayerProps) {
    // Chặn mềm tải xuống khi admin chưa bật (ẩn nút download + menu chuột phải).
    const audioGuardProps = allowDownload
        ? {}
        : {
            controlsList: 'nodownload' as const,
            onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        };
    const [ttsSupported, setTtsSupported] = useState(false);
    // Giọng đọc AI (VieNeu-TTS) — sinh trên server, cache theo chương.
    const [aiUrl, setAiUrl] = useState<string | null>(ttsAudioUrl ?? null);
    const [aiStatus, setAiStatus] = useState<TtsAudioStatus | null>(ttsAudioStatus ?? null);
    const [aiRequesting, setAiRequesting] = useState(false);
    const [aiError, setAiError] = useState('');
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
        // Bỏ tag biểu cảm AI ([cười]...) — giọng thiết bị sẽ đọc thành lời.
        const text = stripTtsEmotionTags(toPlainText(content));
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

    // Đang PENDING/PROCESSING → poll trạng thái mỗi 8s tới khi xong/lỗi.
    useEffect(() => {
        if (!chapterId || aiUrl) return;
        if (aiStatus !== 'PENDING' && aiStatus !== 'PROCESSING') return;
        let cancelled = false;
        const interval = setInterval(async () => {
            try {
                const res = await chaptersService.getTtsStatus(chapterId);
                if (cancelled) return;
                // Chỉ nhận url khi status READY — lúc sinh LẠI, url cũ vẫn còn
                // trong DB nhưng status là PENDING/PROCESSING.
                if (res.status === 'READY' && res.url) {
                    setAiUrl(res.url);
                    setAiStatus('READY');
                } else if (res.status && res.status !== aiStatus) {
                    setAiStatus(res.status);
                }
            } catch {
                /* mạng chập chờn — lần poll sau thử lại */
            }
        }, 8000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [chapterId, aiStatus, aiUrl]);

    // Audio AI xuất hiện giữa lúc Web Speech đang đọc → dừng đọc (UI chuyển
    // sang player audio, không còn nút dừng của Web Speech).
    useEffect(() => {
        if (aiUrl && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, [aiUrl]);

    const requestAi = useCallback(async () => {
        if (!chapterId) return;
        setAiRequesting(true);
        setAiError('');
        try {
            const res = await chaptersService.requestTts(chapterId);
            // Sinh lại: status quay về PENDING dù url cũ vẫn còn → ẩn player
            // cũ, hiện tiến trình và poll tới khi có audio mới.
            if (res.status === 'PENDING' || res.status === 'PROCESSING') {
                setAiUrl(null);
                setAiStatus(res.status);
            } else if (res.url) {
                setAiUrl(res.url);
                setAiStatus('READY');
            } else {
                setAiStatus(res.status || 'PENDING');
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const message = err?.response?.data?.error || err?.response?.data?.message;
            if (status === 401) {
                setAiError('Đăng nhập để tạo giọng đọc AI.');
            } else if (status === 503) {
                setAiError('Tính năng giọng đọc AI chưa được bật trên máy chủ.');
            } else {
                setAiError(
                    typeof message === 'string' && message
                        ? message
                        : 'Không tạo được giọng đọc AI, vui lòng thử lại sau.'
                );
            }
        } finally {
            setAiRequesting(false);
        }
    }, [chapterId]);

    // --- Trường hợp 1: có file audio của tác giả ---
    if (audioUrl) {
        return (
            <div className="mb-6 p-4 bg-surface-container rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-on-surface">
                    <Headphones size={18} className="text-primary" />
                    <span>Nghe chương này</span>
                    <span className="text-xs font-normal text-on-surface-variant">(audio do tác giả tải lên)</span>
                </div>
                <audio controls preload="metadata" src={audioUrl} className="w-full" {...audioGuardProps}>
                    Trình duyệt không hỗ trợ phát audio.
                </audio>
            </div>
        );
    }

    // --- Trường hợp 2: audio AI (VieNeu-TTS) đã sinh xong ---
    if (aiUrl) {
        return (
            <div className="mb-6 p-4 bg-surface-container rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3 text-sm font-medium text-on-surface">
                    <Headphones size={18} className="text-primary" />
                    <span>Nghe chương này</span>
                    <span className="text-xs font-normal text-on-surface-variant">(giọng đọc AI)</span>
                    {/* Tác giả/admin: sinh lại audio sau khi đổi giọng đọc AI. */}
                    {canRegenerateTts && chapterId && (
                        <button
                            type="button"
                            onClick={requestAi}
                            disabled={aiRequesting}
                            title="Sinh lại audio bằng giọng đọc AI hiện tại của bạn"
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-outline-variant text-primary hover:bg-surface-container-high transition-colors disabled:opacity-50"
                        >
                            {aiRequesting ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Sparkles size={13} />
                            )}
                            Tạo lại với giọng mới
                        </button>
                    )}
                </div>
                <audio controls preload="metadata" src={aiUrl} className="w-full" {...audioGuardProps}>
                    Trình duyệt không hỗ trợ phát audio.
                </audio>
                {aiError && <p className="mt-2 text-xs text-error">{aiError}</p>}
            </div>
        );
    }

    // --- Trường hợp 3: Web Speech API + khu giọng đọc AI ---
    // Nút tạo chỉ dành cho tác giả; độc giả vẫn thấy tiến trình khi đang sinh
    // (audio tự hiện khi xong nhờ poll).
    const showAiRequest = !!chapterId && !!canRequestTts;
    const aiInProgress = aiStatus === 'PENDING' || aiStatus === 'PROCESSING';
    const showAiSection = showAiRequest || (!!chapterId && aiInProgress);
    if (!ttsSupported && !showAiSection) return null;

    return (
        <div className="mb-6 p-4 bg-surface-container rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
                    <Headphones size={18} className="text-primary" />
                    <span>Nghe chương này</span>
                </div>

                {ttsSupported && (
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
                )}
            </div>

            {ttsState !== 'idle' && (
                <div className="mt-3 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {ttsSupported && (
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
            )}

            {/* Giọng đọc AI: sinh 1 lần trên server (VieNeu-TTS), mọi người
                dùng chung. Đang sinh thì poll (useEffect) tới khi có URL.
                Nút tạo chỉ hiện cho tác giả (showAiRequest). */}
            {showAiSection && (
                <div className="mt-3 pt-3 border-t border-outline-variant/50 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {aiInProgress ? (
                        <span className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
                            <Loader2 size={15} className="animate-spin text-primary" />
                            Đang tạo giọng đọc AI… có thể mất vài phút. Audio sẽ tự xuất hiện tại đây.
                        </span>
                    ) : showAiRequest ? (
                        <button
                            type="button"
                            onClick={requestAi}
                            disabled={aiRequesting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-outline-variant text-primary hover:bg-surface-container-high transition-colors disabled:opacity-60"
                        >
                            <Sparkles size={15} />
                            {aiStatus === 'FAILED' ? 'Tạo lại giọng đọc AI' : 'Tạo giọng đọc AI'}
                        </button>
                    ) : null}
                    {showAiRequest && (
                        aiError ? (
                            <span className="text-xs text-error">{aiError}</span>
                        ) : aiStatus === 'FAILED' ? (
                            <span className="text-xs text-on-surface-variant">
                                Lần tạo trước gặp lỗi — bạn có thể thử lại.
                            </span>
                        ) : !aiInProgress ? (
                            <span className="text-xs text-on-surface-variant">
                                Đọc bằng giọng AI bạn đã cài — tạo một lần, mọi độc giả dùng chung.
                            </span>
                        ) : null
                    )}
                </div>
            )}
        </div>
    );
}
