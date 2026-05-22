import { apiClient, unwrap } from './client';
import { normalizePage } from './types';
import type { ChapterProgress, Paged, ReadingHistory } from './types';

export const ReadingHistoryApi = {
    /** Persist how far (0-100%) the user has read a chapter. */
    async saveProgress(chapterId: string, progress: number): Promise<void> {
        await apiClient.post(`/chapters/${chapterId}/progress`, {
            progress: Math.max(0, Math.min(100, Math.round(progress))),
        });
    },

    async getChapterProgress(chapterId: string): Promise<ChapterProgress> {
        const res = await apiClient.get(`/chapters/${chapterId}/progress`);
        return unwrap<ChapterProgress>(res) ?? { progress: 0, lastRead: null };
    },

    async history(page = 1, limit = 20): Promise<Paged<ReadingHistory>> {
        const res = await apiClient.get('/users/me/history', { params: { page, limit } });
        return normalizePage<ReadingHistory>(unwrap(res));
    },

    /** Recently-read stories, newest first. */
    async continueReading(limit = 10): Promise<ReadingHistory[]> {
        const res = await apiClient.get('/users/me/continue-reading', { params: { limit } });
        const data = unwrap<ReadingHistory[] | Paged<ReadingHistory>>(res);
        return Array.isArray(data) ? data : data?.data ?? [];
    },

    async clear(): Promise<void> {
        await apiClient.delete('/users/me/history');
    },
};
