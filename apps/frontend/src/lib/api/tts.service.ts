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
    /** Nhóm phong cách (backend sort sẵn): Đọc truyện | Kể chuyện | Tự nhiên | Khác | Tin tức. */
    group?: string;
}

export interface TtsPreviewResult {
    audioBase64: string;
    mime: string;
}

/** Tiến độ audio AI toàn truyện (đếm chương đã xuất bản theo trạng thái). */
export interface StoryTtsStatus {
    total: number;
    ready: number;
    pending: number;
    processing: number;
    failed: number;
    none: number;
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
     * Xếp hàng sinh audio AI cho MỌI chương đủ điều kiện của truyện (đã
     * xuất bản, miễn phí, chưa có audio). Chỉ tác giả/admin. Chương READY
     * không bị sinh lại hàng loạt.
     */
    requestStoryTts: async (storyIdOrSlug: string): Promise<{ queued: number } & StoryTtsStatus> => {
        const response = await apiClient.post<any>(`/stories/${storyIdOrSlug}/tts`);
        return unwrap<{ queued: number } & StoryTtsStatus>(response.data);
    },

    /** Tiến độ audio AI của truyện — poll khi còn pending/processing. */
    getStoryTtsStatus: async (storyIdOrSlug: string): Promise<StoryTtsStatus> => {
        const response = await apiClient.get<any>(`/stories/${storyIdOrSlug}/tts`);
        return unwrap<StoryTtsStatus>(response.data);
    },

    /**
     * Nghe thử: voice = preset bất kỳ (chưa cần lưu); bỏ trống = giọng đã
     * cài của user (clone > preset). Trả audio base64 (MP3).
     */
    preview: async (params?: { text?: string; voice?: string }): Promise<TtsPreviewResult> => {
        const response = await apiClient.post<any>('/tts/voice/preview', params || {});
        return unwrap<TtsPreviewResult>(response.data);
    },

    // ── Admin ──────────────────────────────────────────────────────

    getAdminStats: async (): Promise<TtsAdminStats> => {
        const response = await apiClient.get<any>('/admin/tts/stats');
        return unwrap<TtsAdminStats>(response.data);
    },

    getAdminQueue: async (params?: {
        status?: string;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<TtsAdminQueueResult> => {
        const response = await apiClient.get<any>('/admin/tts/queue', { params });
        return unwrap<TtsAdminQueueResult>(response.data);
    },

    adminResetChapterTts: async (chapterId: string): Promise<{ ok: boolean }> => {
        const response = await apiClient.post<any>(`/admin/tts/reset/${chapterId}`);
        return unwrap<{ ok: boolean }>(response.data);
    },
};

// ── Admin types ──────────────────────────────────────────────────

export interface TtsAdminStats {
    enabled: boolean;
    queueEnabled: boolean;
    workerCount: number;
    total: number;
    ready: number;
    pending: number;
    processing: number;
    failed: number;
    none: number;
}

export interface TtsAdminQueueItem {
    id: string;
    title: string;
    slug: string;
    ttsAudioStatus: string | null;
    ttsAudioUrl: string | null;
    ttsVoiceName: string | null;
    order: number;
    isPublished: boolean;
    createdAt: string;
    story: { id: string; title: string; slug: string; authorId: string };
}

export interface TtsAdminQueueResult {
    items: TtsAdminQueueItem[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
