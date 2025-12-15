import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storiesService, Story, CreateStoryRequest, UpdateStoryRequest, StoryQueryParams } from '../stories.service';
import { PaginatedResponse } from '../client';

export const useStories = (params?: StoryQueryParams) => {
    return useQuery({
        queryKey: ['stories', params],
        queryFn: async () => {
            const response = await storiesService.getAll(params);
            return response.data || response; // Handle both ApiResponse and direct PaginatedResponse
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useStory = (slug: string) => {
    return useQuery({
        queryKey: ['story', slug],
        queryFn: async () => {
            const response = await storiesService.getBySlug(slug);
            // Handle both ApiResponse format and direct Story object
            if ((response as any)?.data && (response as any)?.success !== undefined) {
                return (response as any).data; // ApiResponse format
            }
            return response; // Direct Story object
        },
        enabled: !!slug,
        staleTime: 5 * 60 * 1000,
    });
};

export const useMyStories = (params?: StoryQueryParams) => {
    return useQuery({
        queryKey: ['stories', 'me', params],
        queryFn: async () => {
            const response = await storiesService.getMyStories(params);
            // Handle both ApiResponse and direct PaginatedResponse
            if (response.data && response.meta) {
                return response; // Already PaginatedResponse
            }
            if ((response as any).data) {
                return (response as any).data; // Extract from ApiResponse
            }
            return response; // Direct response
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

// Homepage hooks
export const useNewestStories = (limit: number = 15) => {
    return useQuery({
        queryKey: ['stories', 'homepage', 'newest', limit],
        queryFn: () => storiesService.getNewest(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useBestOfMonth = (limit: number = 15) => {
    return useQuery({
        queryKey: ['stories', 'homepage', 'best-of-month', limit],
        queryFn: () => storiesService.getBestOfMonth(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useRecommendedStories = (limit: number = 15) => {
    return useQuery({
        queryKey: ['stories', 'homepage', 'recommended', limit],
        queryFn: () => storiesService.getRecommended(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useTopRatedStories = (limit: number = 15) => {
    return useQuery({
        queryKey: ['stories', 'homepage', 'top-rated', limit],
        queryFn: () => storiesService.getTopRated(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useMostLikedStories = (limit: number = 15) => {
    return useQuery({
        queryKey: ['stories', 'homepage', 'most-liked', limit],
        queryFn: () => storiesService.getMostLiked(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useCreateStory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateStoryRequest) => storiesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'me'] });
        },
    });
};

export const useUpdateStory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateStoryRequest }) =>
            storiesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['story', variables.id] });
        },
    });
};

export const useDeleteStory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => storiesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'me'] });
        },
    });
};

export const usePublishStory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => storiesService.publish(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['story'] });
        },
    });
};

