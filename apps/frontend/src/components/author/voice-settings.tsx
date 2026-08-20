'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Play, Trash2, UploadCloud, Volume2 } from 'lucide-react';
import { ttsService, TtsPresetVoice } from '@/lib/api/tts.service';
import { TTS_EMOTION_TAGS } from '@/utils/tts-emotion';

const MAX_VOICE_SIZE = 10 * 1024 * 1024; // 10MB — khớp giới hạn backend
const ACCEPT = '.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac,audio/*';

/** Gom giọng theo group, giữ thứ tự mảng (backend đã sort nhóm phù hợp lên đầu). */
function groupVoices(voices: TtsPresetVoice[]): [string, TtsPresetVoice[]][] {
    const groups: [string, TtsPresetVoice[]][] = [];
    for (const v of voices) {
        const g = v.group || 'Khác';
        const last = groups[groups.length - 1];
        if (last && last[0] === g) {
            last[1].push(v);
        } else {
            groups.push([g, [v]]);
        }
    }
    return groups;
}

function groupLabel(group: string): string {
    if (group === 'Đọc truyện') return 'Giọng đọc truyện (khuyên dùng)';
    if (group === 'Kể chuyện') return 'Giọng kể chuyện';
    if (group === 'Tự nhiên') return 'Giọng tự nhiên';
    if (group === 'Tin tức') return 'Giọng tin tức (ít hợp văn truyện)';
    return group;
}

/** Bỏ phần phong cách cuối label (trùng tên nhóm): "Quỳnh Anh — Nữ · Bắc". */
function shortVoiceLabel(label: string): string {
    return label.replace(/\s*·\s*(Phong cách|Giọng đọc)[^·]*$/i, '');
}

/**
 * Card "Giọng đọc AI" trong bảng điều khiển tác giả:
 * - Chọn giọng preset của VieNeu (Minh Đức, Trúc Ly, Adam...) cho truyện.
 * - Hoặc tải clip 3–10s để CLONE giọng của chính mình (ưu tiên hơn preset).
 * - Nghe thử từng giọng trước khi chọn.
 * Giọng áp dụng cho audio AI sinh SAU thời điểm đổi; chương đã có audio thì
 * tác giả bấm "Tạo lại với giọng mới" ở trang đọc chương.
 */
export function VoiceSettings() {
    const inputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [voices, setVoices] = useState<TtsPresetVoice[]>([]);
    const [preset, setPreset] = useState('');
    const [cloneUrl, setCloneUrl] = useState<string | null>(null);
    const [savingPreset, setSavingPreset] = useState(false);
    const [uploading, setUploading] = useState(false);
    // Đang nghe thử giọng nào: id preset, 'mine' (giọng clone), '' = không.
    const [previewing, setPreviewing] = useState('');
    // data: URI audio nghe thử — render <audio controls> thay vì chỉ play()
    // programmatic: chờ server sinh xong (10-30s) thì user-gesture đã hết
    // hạn, Chrome chặn autoplay im lặng.
    const [previewSrc, setPreviewSrc] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [info, list] = await Promise.all([
                    ttsService.getMyVoice(),
                    ttsService.listVoices().catch(() => []),
                ]);
                if (cancelled) return;
                setEnabled(info.enabled);
                setPreset(info.preset || '');
                setCloneUrl(info.url);
                setVoices(list);
            } catch {
                /* chưa đăng nhập / lỗi mạng — card tự ẩn phần nội dung */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
            audioRef.current?.pause();
        };
    }, []);

    const playBase64 = (b64: string, mime: string) => {
        audioRef.current?.pause();
        const src = `data:${mime};base64,${b64}`;
        setPreviewSrc(src);
        // Thử phát luôn — bị autoplay policy chặn thì user bấm play trên
        // player vừa hiện ra.
        const audio = new Audio(src);
        audioRef.current = audio;
        audio.play().catch(() => { });
    };

    const handlePreview = async (voice?: string) => {
        setError('');
        setPreviewSrc('');
        setPreviewing(voice || 'mine');
        try {
            const res = await ttsService.preview(voice ? { voice } : {});
            playBase64(res.audioBase64, res.mime);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không nghe thử được, thử lại sau.');
        } finally {
            setPreviewing('');
        }
    };

    const handlePresetChange = async (value: string) => {
        setPreset(value);
        setError('');
        setNotice('');
        setSavingPreset(true);
        try {
            await ttsService.setPreset(value || null);
            setNotice('Đã lưu giọng đọc.');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không lưu được giọng, thử lại sau.');
        } finally {
            setSavingPreset(false);
        }
    };

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setError('');
        setNotice('');
        if (file.size > MAX_VOICE_SIZE) {
            setError('Clip mẫu không được quá 10MB (chỉ cần 3–10 giây).');
            return;
        }
        setUploading(true);
        try {
            const { url } = await ttsService.uploadVoice(file);
            setCloneUrl(url);
            setNotice('Đã lưu mẫu giọng — audio AI mới sẽ đọc bằng giọng của bạn.');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Tải mẫu giọng thất bại, thử lại sau.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleDeleteClone = async () => {
        setError('');
        setNotice('');
        try {
            await ttsService.deleteVoice();
            setCloneUrl(null);
            setNotice('Đã gỡ mẫu giọng — quay về giọng chọn bên trên.');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Không gỡ được mẫu giọng.');
        }
    };

    if (loading) return null;

    return (
        <div className="mb-6 p-4 md:p-5 bg-surface-container rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-on-surface">
                <Volume2 size={18} className="text-primary" />
                <span>Giọng đọc AI cho truyện của bạn</span>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
                Khi độc giả bấm &quot;Tạo giọng đọc AI&quot; ở chương truyện của bạn, hệ thống
                sẽ đọc bằng giọng bạn cài ở đây. Chương đã có audio muốn đổi giọng thì mở
                trang đọc chương và bấm &quot;Tạo lại với giọng mới&quot;.
            </p>

            {!enabled && (
                <p className="text-xs text-on-surface-variant italic">
                    Tính năng giọng đọc AI chưa được bật trên máy chủ — cài đặt bên dưới sẽ
                    được áp dụng khi tính năng bật.
                </p>
            )}

            {/* 1. Giọng có sẵn */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    Chọn giọng có sẵn
                </label>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={preset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        disabled={savingPreset}
                        className="px-3 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface min-w-[220px]"
                        aria-label="Giọng đọc AI"
                    >
                        <option value="">Giọng mặc định hệ thống</option>
                        {/* Backend đã sort: Đọc truyện → Kể chuyện → Tự nhiên → Tin tức.
                            Gom optgroup theo thứ tự mảng; label option bỏ phần phong
                            cách (trùng tên nhóm). */}
                        {groupVoices(voices).map(([group, items]) => (
                            <optgroup key={group} label={groupLabel(group)}>
                                {items.map((v) => (
                                    <option key={v.id} value={v.id}>{shortVoiceLabel(v.label)}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => handlePreview(preset || undefined)}
                        disabled={!!previewing || (!preset && !cloneUrl && voices.length === 0)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-outline-variant text-primary hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                        {previewing && previewing !== 'mine' ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Play size={14} />
                        )}
                        Nghe thử
                    </button>
                    {savingPreset && <Loader2 size={14} className="animate-spin text-primary" />}
                </div>
                {voices.length === 0 && enabled && (
                    <p className="mt-1 text-xs text-on-surface-variant">
                        Danh sách giọng sẽ hiện khi máy chủ giọng đọc khởi động xong.
                    </p>
                )}
            </div>

            {/* 2. Clone giọng riêng */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    Hoặc dùng chính giọng của bạn (ưu tiên hơn giọng chọn bên trên)
                </label>
                {cloneUrl ? (
                    <div className="flex flex-col gap-2 p-3 border border-outline-variant rounded-lg bg-surface-container-low">
                        <div className="flex items-center gap-2 text-sm text-on-surface">
                            <Mic size={15} className="text-primary flex-shrink-0" />
                            <span>Đã có mẫu giọng của bạn</span>
                            <button
                                type="button"
                                onClick={() => handlePreview()}
                                disabled={!!previewing}
                                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
                            >
                                {previewing === 'mine' ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Play size={14} />
                                )}
                                Nghe thử giọng AI
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteClone}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                                Gỡ
                            </button>
                        </div>
                        <audio controls preload="none" src={cloneUrl} className="w-full h-9">
                            Trình duyệt không hỗ trợ phát audio.
                        </audio>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                        <UploadCloud size={18} />
                        {uploading
                            ? 'Đang tải lên...'
                            : 'Tải clip giọng của bạn (3–10 giây, tối đa 10MB)'}
                    </button>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <p className="mt-1.5 text-xs text-on-surface-variant">
                    Mẹo thu mẫu giọng tốt: đọc rõ ràng 1–2 câu bất kỳ trong phòng yên tĩnh
                    (thu bằng điện thoại là đủ). Hệ thống tự lọc tạp âm.
                </p>
            </div>

            {/* 3. Hướng dẫn biểu cảm */}
            <details className="text-sm">
                <summary className="cursor-pointer text-primary font-medium">
                    Hướng dẫn: thêm biểu cảm cho giọng đọc trong lời truyện
                </summary>
                <div className="mt-2 text-xs text-on-surface-variant space-y-1.5">
                    <p>
                        Chèn tag vào bất kỳ chỗ nào trong nội dung chương để giọng AI diễn
                        biểu cảm tại đó. Tag <strong>không hiển thị</strong> với độc giả khi
                        đọc chữ — chỉ nghe thấy trong audio AI.
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                        {TTS_EMOTION_TAGS.map((t) => (
                            <li key={t.tag}>
                                <code className="px-1 py-0.5 bg-surface-container-high rounded">{t.tag}</code>
                                {' '}— {t.desc}
                            </li>
                        ))}
                    </ul>
                    <p>
                        Ví dụ: <em>&quot;Nghe hay quá đi [cười]. Để mình kể tiếp [hắng giọng].&quot;</em>
                    </p>
                    <p>
                        Dấu câu cũng ảnh hưởng ngữ điệu: dấu chấm ngắt nghỉ rõ, dấu ba chấm…
                        tạo khoảng lặng, dấu hỏi/chấm than lên giọng. Tính năng biểu cảm đang
                        ở giai đoạn thử nghiệm — dùng vừa phải sẽ tự nhiên nhất.
                    </p>
                </div>
            </details>

            {previewSrc && (
                <div className="mt-3">
                    <p className="text-xs text-on-surface-variant mb-1">Bản nghe thử:</p>
                    <audio controls src={previewSrc} className="w-full h-9">
                        Trình duyệt không hỗ trợ phát audio.
                    </audio>
                </div>
            )}

            {(error || notice) && (
                <p className={`mt-3 text-xs ${error ? 'text-red-500' : 'text-primary'}`}>
                    {error || notice}
                </p>
            )}
        </div>
    );
}
