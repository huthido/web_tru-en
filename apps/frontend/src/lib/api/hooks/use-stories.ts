import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storiesService, Story, CreateStoryRequest, UpdateStoryRequest, StoryQueryParams } from '../stories.service';
import { PaginatedResponse } from '../client';
import { apiClient } from '../client';

export const useStories = (params?: StoryQueryParams) => {
    return useQuery({
        queryKey: ['stories', params],
        queryFn: async () => {
            const response = await storiesService.getAll(params);
            // Response should already be PaginatedResponse from storiesService.getAll
            // But check if it's wrapped in ApiResponse format
            if (response && 'data' in response && 'meta' in response) {
                return response; // Already PaginatedResponse
            }
            // If wrapped in ApiResponse, extract it
            if ((response as any)?.data && (response as any)?.meta) {
                return (response as any) as PaginatedResponse<Story>;
            }
            // Fallback: return as is
            return response;
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
        // 403 (chưa xuất bản) / 404 (không tồn tại) là kết quả chắc chắn —
        // retry chỉ làm người dùng chờ lâu hơn mới thấy thông báo.
        retry: (failureCount, error: any) => {
            const status = error?.response?.status;
            if (status === 403 || status === 404) return false;
            return failureCount < 1;
        },
    });
};

export const useStoryAccess = (slug: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['story', 'access', slug],
        queryFn: () => storiesService.getAccessInfo(slug),
        enabled: !!slug && enabled,
        staleTime: 60 * 1000,
    });
};

export const useBuyStory = (slug: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => storiesService.buy(slug),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['story', 'access', slug] }),
                queryClient.invalidateQueries({ queryKey: ['story', slug] }),
                queryClient.invalidateQueries({ queryKey: ['chapter', slug] }),
                queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
            ]);
        },
    });
};

export const useSimilarStories = (storyId: string, limit: number = 10) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'similar', storyId, limit],
        queryFn: async () => {
            const response = await apiClient.get(`/stories/${storyId}/similar?limit=${limit}`);
            // Handle ApiResponse wrapper
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            // If direct array response
            if (Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        },
        enabled: !!storyId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useRecommendedStoriesForUser = (limit: number = 10) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'recommended', 'user', limit],
        queryFn: async () => {
            const response = await apiClient.get(`/stories/recommended?limit=${limit}`);
            return response.data.data || [];
        },
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
            if ((response as any)?.data?.data && (response as any)?.data?.meta) {
                return (response as any).data; // Nested ApiResponse
            }
            return response;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

export const useNewestStories = (limit: number = 15) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'homepage', 'newest', limit],
        queryFn: async () => {
            const response = await storiesService.getNewest(limit);
            return Array.isArray(response) ? response : (response as any)?.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useBestOfMonth = (limit: number = 15) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'homepage', 'best-of-month', limit],
        queryFn: async () => {
            const response = await storiesService.getBestOfMonth(limit);
            return Array.isArray(response) ? response : (response as any)?.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useRecommendedStories = (limit: number = 15) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'homepage', 'recommended', limit],
        queryFn: async () => {
            const response = await storiesService.getRecommended(limit);
            return Array.isArray(response) ? response : (response as any)?.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useTopRatedStories = (limit: number = 15) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'homepage', 'top-rated', limit],
        queryFn: async () => {
            const response = await storiesService.getTopRated(limit);
            return Array.isArray(response) ? response : (response as any)?.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useMostLikedStories = (limit: number = 15) => {
    return useQuery<Story[]>({
        queryKey: ['stories', 'homepage', 'most-liked', limit],
        queryFn: async () => {
            const response = await storiesService.getMostLiked(limit);
            return Array.isArray(response) ? response : (response as any)?.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateStory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStoryRequest) => storiesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
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
            queryClient.invalidateQueries({ queryKey: ['story', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'homepage'] });
        },
    });
};

export const useDeleteStory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storiesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
        },
    });
};

export const usePublishStory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storiesService.publish(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['story'] });
        },
    });
};

export const useCheckLiked = (storyId: string, enabled: boolean = true) => {
    return useQuery<{ isLiked: boolean }>({
        queryKey: ['stories', storyId, 'liked'],
        queryFn: async () => {
            const response = await storiesService.checkLiked(storyId);
            return { isLiked: response.isLiked || false };
        },
        enabled: enabled && !!storyId,
        staleTime: 2 * 60 * 1000,
    });
};

export const useLikeStory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (storyId: string) => storiesService.likeStory(storyId),
        onSuccess: (_, storyId) => {
            queryClient.invalidateQueries({ queryKey: ['stories', storyId, 'liked'] });
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'liked'] }); // Invalidate liked stories list
        },
    });
};

export const useUnlikeStory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (storyId: string) => storiesService.unlikeStory(storyId),
        onSuccess: (_, storyId) => {
            queryClient.invalidateQueries({ queryKey: ['stories', storyId, 'liked'] });
            queryClient.invalidateQueries({ queryKey: ['story', storyId] });
            queryClient.invalidateQueries({ queryKey: ['stories'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'liked'] }); // Invalidate liked stories list
        },
    });
};

export const useLikedStories = (params?: { page?: number; limit?: number }) => {
    return useQuery({
        queryKey: ['stories', 'liked', params],
        queryFn: async () => {
            const response = await storiesService.getLikedStories(params);
            // Handle ApiResponse wrapper
            if (response && 'data' in response && 'meta' in response) {
                return response; // Already PaginatedResponse format
            }
            // If wrapped in ApiResponse, extract it
            if ((response as any)?.data?.data && (response as any)?.data?.meta) {
                return (response as any).data;
            }
            return response;
        },
        enabled: !!params, // Only fetch when params are provided (user is logged in)
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};
