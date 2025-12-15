import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    chaptersService,
    Chapter,
    CreateChapterRequest,
    UpdateChapterRequest,
} from '../chapters.service';

export const useChapters = (storySlug: string) => {
    return useQuery({
        queryKey: ['chapters', storySlug],
        queryFn: async () => {
            const response = await chaptersService.getAll(storySlug);
            // Handle both ApiResponse format and direct array
            if (Array.isArray(response)) {
                return response;
            }
            if (response.data && Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        },
        enabled: !!storySlug,
        staleTime: 5 * 60 * 1000,
    });
};

export const useChapter = (storySlug: string, chapterSlug: string) => {
    return useQuery({
        queryKey: ['chapter', storySlug, chapterSlug],
        queryFn: async () => {
            const response = await chaptersService.getBySlug(storySlug, chapterSlug);
            // Handle both ApiResponse format and direct object
            return response.data || response;
        },
        enabled: !!storySlug && !!chapterSlug,
        staleTime: 10 * 60 * 1000, // 10 minutes (chapter content doesn't change often)
    });
};

export const useCreateChapter = (storySlug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateChapterRequest) =>
            chaptersService.create(storySlug, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chapters', storySlug] });
            queryClient.invalidateQueries({ queryKey: ['story', storySlug] });
        },
    });
};

export const useUpdateChapter = (storySlug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateChapterRequest }) =>
            chaptersService.update(storySlug, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chapters', storySlug] });
            queryClient.invalidateQueries({ queryKey: ['chapter'] });
        },
    });
};

export const useDeleteChapter = (storySlug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => chaptersService.delete(storySlug, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chapters', storySlug] });
            queryClient.invalidateQueries({ queryKey: ['story', storySlug] });
        },
    });
};

export const usePublishChapter = (storySlug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => chaptersService.publish(storySlug, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chapters', storySlug] });
            queryClient.invalidateQueries({ queryKey: ['chapter'] });
        },
    });
};

