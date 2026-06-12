import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArtApi, ArtPost, RNFileLike } from '../api/art.service';

export const artKeys = {
    feed: ['art', 'feed'] as const,
    stories: ['art', 'stories'] as const,
    comments: (postId: string) => ['art', 'comments', postId] as const,
};

export function useArtFeed() {
    return useInfiniteQuery({
        queryKey: artKeys.feed,
        queryFn: ({ pageParam }) => ArtApi.getFeed(pageParam as string | undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => (last?.hasMore ? last.nextCursor : undefined),
        staleTime: 30_000,
    });
}

export function useArtStories() {
    return useQuery({
        queryKey: artKeys.stories,
        queryFn: ArtApi.getStories,
        staleTime: 30_000,
    });
}

export function useArtComments(postId: string, enabled = true) {
    return useInfiniteQuery({
        queryKey: artKeys.comments(postId),
        queryFn: ({ pageParam }) => ArtApi.getComments(postId, pageParam as string | undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => (last?.hasMore ? last.nextCursor : undefined),
        enabled: enabled && !!postId,
    });
}

export function useCreateArtPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (params: { file: RNFileLike; caption?: string; width?: number; height?: number }) => {
            const { url } = await ArtApi.uploadImage(params.file);
            return ArtApi.createPost({ imageUrl: url, caption: params.caption, width: params.width, height: params.height });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: artKeys.feed }),
    });
}

export function useDeleteArtPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ArtApi.deletePost,
        onSuccess: () => qc.invalidateQueries({ queryKey: artKeys.feed }),
    });
}

export function useToggleArtLike() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ArtApi.toggleLike,
        onMutate: async (postId: string) => {
            await qc.cancelQueries({ queryKey: artKeys.feed });
            const prev = qc.getQueryData(artKeys.feed);
            qc.setQueryData(artKeys.feed, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((p: ArtPost) =>
                            p.id === postId
                                ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1 }
                                : p,
                        ),
                    })),
                };
            });
            return { prev };
        },
        onError: (_err: any, _postId: any, ctx: any) => {
            if (ctx?.prev) qc.setQueryData(artKeys.feed, ctx.prev);
        },
    });
}

export function useAddArtComment(postId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (content: string) => ArtApi.addComment(postId, content),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: artKeys.comments(postId) });
            qc.setQueryData(artKeys.feed, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((p: ArtPost) =>
                            p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
                        ),
                    })),
                };
            });
        },
    });
}

export function useCreateArtStory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (file: RNFileLike) => ArtApi.createStory(file),
        onSuccess: () => qc.invalidateQueries({ queryKey: artKeys.stories }),
    });
}
