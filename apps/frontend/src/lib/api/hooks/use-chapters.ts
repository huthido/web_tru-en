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
        refetchOnMount: 'always', // Always refetch on mount to ensure fresh data
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
        onSuccess: async () => {
            // Invalidate and refetch immediately
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['chapters', storySlug], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ['story', storySlug], refetchType: 'active' }),
            ]);
            // Ensure refetch happens
            await queryClient.refetchQueries({ queryKey: ['chapters', storySlug] });
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

export const useUnpublishChapter = (storySlug: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => chaptersService.unpublish(storySlug, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chapters', storySlug] });
            queryClient.invalidateQueries({ queryKey: ['chapter'] });
        },
    });
};

// Admin hooks
export const useAdminChapters = (params?: {
    page?: number;
    limit?: number;
    search?: string;
    storyId?: string;
    isPublished?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) => {
    return useQuery({
        queryKey: ['admin', 'chapters', params],
        queryFn: async () => {
            const response = await chaptersService.getAllForAdmin(params);
            // Handle ApiResponse wrapper
            if (response && 'data' in response && 'meta' in response) {
                return response;
            }
            if ((response as any)?.data?.data && (response as any)?.data?.meta) {
                return (response as any).data;
            }
            return response;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

export const useChaptersStats = () => {
    return useQuery({
        queryKey: ['admin', 'chapters', 'stats'],
        queryFn: async () => {
            const response = await chaptersService.getChaptersStats();
            return response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useChaptersChartData = (days: number = 30) => {
    return useQuery({
        queryKey: ['admin', 'chapters', 'chart-data', days],
        queryFn: async () => {
            const response = await chaptersService.getChaptersChartData(days);
            return response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

