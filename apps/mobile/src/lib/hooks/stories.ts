import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StoriesApi } from '../api/stories.service';

export const storyKeys = {
    detail: (slug: string) => ['story', slug] as const,
    liked: (storyId: string) => ['story', 'liked', storyId] as const,
    home: (kind: string, limit: number) => ['stories', 'home', kind, limit] as const,
};

export type HomeKind = 'newest' | 'bestOfMonth' | 'recommended' | 'topRated' | 'mostLiked';

export function useStory(slug: string) {
    return useQuery({
        queryKey: storyKeys.detail(slug),
        queryFn: () => StoriesApi.getBySlug(slug),
        enabled: !!slug,
        staleTime: 5 * 60_000,
    });
}

/** One curated homepage row (newest / recommended / ...). */
export function useHomeStories(kind: HomeKind, limit = 12) {
    return useQuery({
        queryKey: storyKeys.home(kind, limit),
        queryFn: () => StoriesApi[kind](limit),
        staleTime: 5 * 60_000,
    });
}

export function useStoryLiked(storyId: string | undefined) {
    return useQuery({
        queryKey: storyKeys.liked(storyId ?? ''),
        queryFn: () => StoriesApi.checkLiked(storyId as string),
        enabled: !!storyId,
        staleTime: 60_000,
    });
}

export function useToggleLike(storyId: string, slug: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (liked: boolean) =>
            liked ? StoriesApi.unlike(storyId) : StoriesApi.like(storyId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: storyKeys.liked(storyId) });
            qc.invalidateQueries({ queryKey: storyKeys.detail(slug) });
        },
    });
}
