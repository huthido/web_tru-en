import { apiClient, ApiResponse } from './client';

/** Cài đặt giọng đọc AI của user (tác giả). */
export interface TtsVoiceInfo {
    /** URL clip mẫu giọng đã tải lên (voice cloning). null = chưa có. */
    url: string | null;
    /** Id giọng preset đã chọn. null = giọng mặc định hệ thống. */
    preset: string | null;
    /** Server có bật tính năng giọng đọc AI không. */
    enabled: boolean;
}

export interface TtsPresetVoice {
    label: string;
    id: string;
}

export interface TtsPreviewResult {
    audioBase64: string;
    mime: string;
}

const unwrap = <T>(data: any): T => (data?.data ?? data) as T;

/** API giọng đọc AI (VieNeu-TTS) — mẫu giọng tác giả + danh sách giọng preset. */
export const ttsService = {
    getMyVoice: async (): Promise<TtsVoiceInfo> => {
        const response = await apiClient.get<TtsVoiceInfo | ApiResponse<TtsVoiceInfo>>('/tts/voice');
        return unwrap<TtsVoiceInfo>(response.data);
    },

    /** Danh sách giọng preset của model (rỗng khi worker chưa sẵn sàng). */
    listVoices: async (): Promise<TtsPresetVoice[]> => {
        const response = await apiClient.get<any>('/tts/voice/list');
        return unwrap<{ voices: TtsPresetVoice[] }>(response.data)?.voices ?? [];
    },

    /** Chọn giọng preset (null = quay về giọng mặc định hệ thống). */
    setPreset: async (voice: string | null): Promise<{ preset: string | null }> => {
        const response = await apiClient.post<any>('/tts/voice/preset', { voice });
        return unwrap<{ preset: string | null }>(response.data);
    },

    /** Tải clip mẫu giọng (3–10s, ≤10MB) để clone. */
    uploadVoice: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<any>('/tts/voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap<{ url: string }>(response.data);
    },

    /** Gỡ clip mẫu giọng. */
    deleteVoice: async (): Promise<void> => {
        await apiClient.delete('/tts/voice');
    },

    /**
     * Nghe thử: voice = preset bất kỳ (chưa cần lưu); bỏ trống = giọng đã
     * cài của user (clone > preset). Trả audio base64 (MP3).
     */
    preview: async (params?: { text?: string; voice?: string }): Promise<TtsPreviewResult> => {
        const response = await apiClient.post<any>('/tts/voice/preview', params || {});
        return unwrap<TtsPreviewResult>(response.data);
    },
};
