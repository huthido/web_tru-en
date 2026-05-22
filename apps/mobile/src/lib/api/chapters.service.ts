import { apiClient, unwrap } from './client';
import type { BuyResponse, Chapter } from './types';

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

    /** Unlock a paid chapter with the user's coin balance. */
    async buy(storySlug: string, chapterId: string): Promise<BuyResponse> {
        const res = await apiClient.post(`/stories/${storySlug}/chapters/${chapterId}/buy`);
        return unwrap<BuyResponse>(res);
    },
};
