import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { FollowsApi } from '../api/follows.service';
import { ReadingHistoryApi } from '../api/reading-history.service';

const PAGE_SIZE = 20;

/* ── Reading history ─────────────────────────────────────────────────── */

export function useContinueReading(limit = 10) {
    return useQuery({
        queryKey: ['continue-reading', limit],
        queryFn: () => ReadingHistoryApi.continueReading(limit),
        staleTime: 30_000,
    });
}

export function useReadingHistory() {
    return useInfiniteQuery({
        queryKey: ['reading-history'],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => ReadingHistoryApi.history(pageParam, PAGE_SIZE),
        getNextPageParam: (last) =>
            last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
        staleTime: 30_000,
    });
}

export function useClearHistory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => ReadingHistoryApi.clear(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['reading-history'] });
            qc.invalidateQueries({ queryKey: ['continue-reading'] });
        },
    });
}

export function useChapterProgress(chapterId: string | undefined) {
    return useQuery({
        queryKey: ['chapter-progress', chapterId],
        queryFn: () => ReadingHistoryApi.getChapterProgress(chapterId as string),
        enabled: !!chapterId,
        staleTime: 30_000,
    });
}

/** Persist reading progress. Debounced by the caller — no refetch on success. */
export function useSaveProgress() {
    return useMutation({
        mutationFn: ({ chapterId, progress }: { chapterId: string; progress: number }) =>
            ReadingHistoryApi.saveProgress(chapterId, progress),
    });
}

/* ── Follows ─────────────────────────────────────────────────────────── */

export function useMyFollows() {
    return useInfiniteQuery({
        queryKey: ['my-follows'],
        initialPageParam: 1,
        queryFn: ({ pageParam }) => FollowsApi.myFollows(pageParam, PAGE_SIZE),
        getNextPageParam: (last) =>
            last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
        staleTime: 30_000,
    });
}

export function useFollowStatus(storyId: string | undefined) {
    return useQuery({
        queryKey: ['follow-status', storyId],
        queryFn: () => FollowsApi.checkFollowing(storyId as string),
        enabled: !!storyId,
        staleTime: 60_000,
    });
}

export function useToggleFollow(storyId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (following: boolean) =>
            following ? FollowsApi.unfollow(storyId) : FollowsApi.follow(storyId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['follow-status', storyId] });
            qc.invalidateQueries({ queryKey: ['my-follows'] });
        },
    });
}
