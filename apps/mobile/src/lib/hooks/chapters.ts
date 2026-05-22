import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChaptersApi } from '../api/chapters.service';
import { StoriesApi } from '../api/stories.service';
import { storyKeys } from './stories';

export const chapterKeys = {
    list: (storySlug: string) => ['chapters', storySlug] as const,
    detail: (storySlug: string, chapterSlug: string) =>
        ['chapter', storySlug, chapterSlug] as const,
};

export function useChapters(storySlug: string) {
    return useQuery({
        queryKey: chapterKeys.list(storySlug),
        queryFn: () => ChaptersApi.list(storySlug),
        enabled: !!storySlug,
        staleTime: 5 * 60_000,
    });
}

export function useChapter(storySlug: string, chapterSlug: string) {
    return useQuery({
        queryKey: chapterKeys.detail(storySlug, chapterSlug),
        queryFn: () => ChaptersApi.get(storySlug, chapterSlug),
        enabled: !!storySlug && !!chapterSlug,
        staleTime: 10 * 60_000,
    });
}

/** Unlock a paid chapter; refreshes the chapter + wallet on success. */
export function useBuyChapter(storySlug: string, chapterSlug: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (chapterId: string) => ChaptersApi.buy(storySlug, chapterId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: chapterKeys.detail(storySlug, chapterSlug) });
            qc.invalidateQueries({ queryKey: chapterKeys.list(storySlug) });
            qc.invalidateQueries({ queryKey: ['wallet'] });
        },
    });
}

/** Buy a whole VIP story. */
export function useBuyStory(slug: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => StoriesApi.buy(slug),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: storyKeys.detail(slug) });
            qc.invalidateQueries({ queryKey: ['chapter', slug] });
            qc.invalidateQueries({ queryKey: ['wallet'] });
        },
    });
}
