'use client';

import { useRef, useState } from 'react';
import { Music, Trash2, UploadCloud } from 'lucide-react';
import { chaptersService } from '@/lib/api/chapters.service';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB — khớp giới hạn backend
const ACCEPT = '.mp3,.m4a,.m4b,.aac,.ogg,.oga,.opus,.wav,.flac,audio/*';

interface ChapterAudioUploadProps {
    /** URL audio hiện tại (null/'' = chưa có). */
    value: string | null;
    onChange: (url: string | null) => void;
}

/**
 * Field upload file audio cho chương (dùng chung trang tạo + sửa chương).
 * Upload xong trả về URL qua onChange; form gắn URL đó vào audioUrl khi submit.
 */
export function ChapterAudioUpload({ value, onChange }: ChapterAudioUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setError('');

        if (file.size > MAX_AUDIO_SIZE) {
            setError('File audio không được quá 100MB');
            return;
        }

        setUploading(true);
        try {
            const { url } = await chaptersService.uploadAudio(file);
            if (!url) throw new Error('Server không trả về URL');
            onChange(url);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                'Có lỗi xảy ra khi tải file audio lên'
            );
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Audio chương (tuỳ chọn)
            </label>

            {value ? (
                <div className="flex flex-col gap-3 p-4 border border-outline-variant rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2 text-sm text-on-surface">
                        <Music size={16} className="text-primary flex-shrink-0" />
                        <span className="truncate" title={value}>Đã gắn file audio</span>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 size={14} />
                            Gỡ audio
                        </button>
                    </div>
                    <audio controls preload="metadata" src={value} className="w-full">
                        Trình duyệt không hỗ trợ phát audio.
                    </audio>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <UploadCloud size={20} />
                    {uploading ? 'Đang tải lên...' : 'Chọn file audio (mp3, m4a, ogg, wav... tối đa 100MB)'}
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <p className="mt-2 text-xs text-on-surface-variant">
                Nếu có audio, độc giả sẽ nghe file bạn tải lên. Nếu không, hệ thống tự đọc
                nội dung chương bằng giọng đọc của thiết bị.
            </p>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}
