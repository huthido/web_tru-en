import { apiClient, unwrap } from './client';
import type { BuyResponse, Chapter } from './types';
import type { RNFileLike } from './stories.service';

export interface CreateChapterInput {
    title: string;
    content: string;
    order?: number;
    images?: string[];
    /** Coin price (0 = free). */
    price?: number;
}

export interface UpdateChapterInput extends Partial<CreateChapterInput> {
    isPublished?: boolean;
}

export const ChaptersApi = {
    /** All chapters of a story, ordered. */
    async list(storySlug: string): Promise<Chapter[]> {
        const res = await apiClient.get(`/stories/${storySlug}/chapters`);
        return unwrap<Chapter[]>(res) ?? [];
    },

    /** One chapter with `content` + lock info. */
    async get(storySlug: string, chapterSlug: string): Promise<Chapter> {
        const res = await apiClient.get(`/stories/${storySlug}/chapters/${chapterSlug}`);
        return unwrap<Chapter>(res);
    },

    /** Lookup a chapter by ID (fetch list + filter — backend has no by-id route). */
    async getById(storySlug: string, chapterId: string): Promise<Chapter | undefined> {
        const all = await this.list(storySlug);
        return all.find((c) => c.id === chapterId);
    },

    /** Unlock a paid chapter with the user's coin balance. */
    async buy(storySlug: string, chapterId: string): Promise<BuyResponse> {
        const res = await apiClient.post(`/stories/${storySlug}/chapters/${chapterId}/buy`);
        return unwrap<BuyResponse>(res);
    },

    // ─── Author endpoints ───────────────────────────────────────────────

    async create(storySlug: string, data: CreateChapterInput): Promise<Chapter> {
        const res = await apiClient.post(`/stories/${storySlug}/chapters`, data);
        return unwrap<Chapter>(res);
    },

    async update(
        storySlug: string,
        chapterId: string,
        data: UpdateChapterInput,
    ): Promise<Chapter> {
        const res = await apiClient.patch(`/stories/${storySlug}/chapters/${chapterId}`, data);
        return unwrap<Chapter>(res);
    },

    async remove(storySlug: string, chapterId: string): Promise<void> {
        await apiClient.delete(`/stories/${storySlug}/chapters/${chapterId}`);
    },

    async publish(storySlug: string, chapterId: string): Promise<Chapter> {
        const res = await apiClient.post(`/stories/${storySlug}/chapters/${chapterId}/publish`);
        return unwrap<Chapter>(res);
    },

    async unpublish(storySlug: string, chapterId: string): Promise<Chapter> {
        const res = await apiClient.post(`/stories/${storySlug}/chapters/${chapterId}/unpublish`);
        return unwrap<Chapter>(res);
    },

    /** Upload an inline image for a chapter (returns URL). */
    async uploadImage(file: RNFileLike): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            type: file.type ?? 'image/jpeg',
            name: file.name ?? 'chapter-image.jpg',
        } as any);
        const res = await apiClient.post('/chapters/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap<{ url: string }>(res);
    },
};
