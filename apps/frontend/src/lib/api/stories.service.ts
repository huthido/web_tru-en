import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './client';

export interface Story {
    id: string;
    title: string;
    slug: string;
    description?: string;
    coverImage?: string;
    authorId: string;
    authorName?: string;
    status: 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED';
    isPublished: boolean;
    viewCount: number;
    likeCount: number;
    followCount: number;
    rating: number;
    ratingCount: number;
    isRecommended?: boolean;
    country?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    lastChapterAt?: string;
    author?: {
        id: string;
        username: string;
        displayName?: string;
        avatar?: string;
    };
    storyCategories?: Array<{
        category: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
    storyTags?: Array<{
        tag: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
    chapters?: Array<{
        id: string;
        title: string;
        slug: string;
        order: number;
        viewCount: number;
        createdAt: string;
    }>;
    _count?: {
        chapters: number;
        follows: number;
        favorites: number;
        ratings: number;
    };
}

export interface CreateStoryRequest {
    title: string;
    description?: string;
    coverImage?: string;
    categoryIds?: string[];
    tags?: string[];
    country?: string;
}

export interface UpdateStoryRequest {
    title?: string;
    description?: string;
    coverImage?: string;
    categoryIds?: string[];
    tags?: string[];
    status?: 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED';
    isPublished?: boolean;
    country?: string;
    isRecommended?: boolean;
}

export interface StoryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    categories?: string[];
    status?: string;
    sortBy?: 'newest' | 'popular' | 'rating' | 'viewCount';
    country?: string;
}

export const storiesService = {
    getAll: async (params?: StoryQueryParams): Promise<PaginatedResponse<Story>> => {
        const response = await apiClient.get<PaginatedResponse<Story> | ApiResponse<PaginatedResponse<Story>>>('/stories', {
            params,
        });
        // Handle ApiResponse wrapper: response.data is ApiResponse, response.data.data is PaginatedResponse
        const apiResponse = response.data as any;

        // If it's wrapped in ApiResponse format (has success, data, timestamp)
        if (apiResponse?.success !== undefined && apiResponse?.data) {
            // Check if data is already PaginatedResponse (has data array and meta)
            if (apiResponse.data?.data && Array.isArray(apiResponse.data.data) && apiResponse.data?.meta) {
                return apiResponse.data; // Extract PaginatedResponse from ApiResponse
            }
            // If data is array directly (shouldn't happen but handle it)
            if (Array.isArray(apiResponse.data)) {
                return {
                    data: apiResponse.data,
                    meta: apiResponse.meta || { page: 1, limit: 20, total: apiResponse.data.length, totalPages: 1 },
                };
            }
        }

        // If already PaginatedResponse format (has data array and meta)
        if (apiResponse?.data && Array.isArray(apiResponse.data) && apiResponse?.meta) {
            return apiResponse; // Already PaginatedResponse
        }

        // Fallback: return as is (might be empty or error)
        return apiResponse || { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    },

    getBySlug: async (slugOrId: string): Promise<ApiResponse<Story> | Story> => {
        // Backend supports both ID and slug, so we can pass either
        const response = await apiClient.get<Story | ApiResponse<Story>>(`/stories/${slugOrId}`);
        const data = response.data as any;
        // Handle ApiResponse wrapper
        if (data?.success !== undefined && data?.data) {
            return data.data as Story;
        }
        // If it's already a Story object (has id, title, etc.), return it
        if (data && data.id && data.title) {
            return data as Story;
        }
        // Otherwise, it's ApiResponse format
        return data as ApiResponse<Story>;
    },

    create: async (data: CreateStoryRequest): Promise<ApiResponse<Story>> => {
        const response = await apiClient.post<Story>('/stories', data);
        return response.data;
    },

    update: async (
        id: string,
        data: UpdateStoryRequest
    ): Promise<ApiResponse<Story>> => {
        const response = await apiClient.patch<Story>(`/stories/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse> => {
        const response = await apiClient.delete(`/stories/${id}`);
        return response.data;
    },

    publish: async (id: string): Promise<ApiResponse<Story>> => {
        const response = await apiClient.post<Story>(`/stories/${id}/publish`);
        return response.data;
    },

    getMyStories: async (
        params?: StoryQueryParams
    ): Promise<PaginatedResponse<Story>> => {
        const response = await apiClient.get<PaginatedResponse<Story>>(
            '/stories/me/list',
            { params }
        );
        // Handle ApiResponse wrapper: response.data is ApiResponse, response.data.data is PaginatedResponse
        const apiResponse = response.data as any;
        if (apiResponse?.data && apiResponse?.meta) {
            return apiResponse; // Already PaginatedResponse
        }
        if (apiResponse?.data) {
            return apiResponse.data; // Extract from ApiResponse
        }
        return apiResponse; // Direct response
    },

    uploadCover: async (file: File): Promise<ApiResponse<{ coverImage: string }>> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ coverImage: string }>(
            '/stories/upload-cover',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    // Homepage endpoints
    getNewest: async (limit: number = 15): Promise<Story[]> => {
        const response = await apiClient.get<Story[]>(`/stories/homepage/newest?limit=${limit}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    getBestOfMonth: async (limit: number = 15): Promise<Story[]> => {
        const response = await apiClient.get<Story[]>(`/stories/homepage/best-of-month?limit=${limit}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    getRecommended: async (limit: number = 15): Promise<Story[]> => {
        const response = await apiClient.get<Story[]>(`/stories/homepage/recommended?limit=${limit}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    getTopRated: async (limit: number = 15): Promise<Story[]> => {
        const response = await apiClient.get<Story[]>(`/stories/homepage/top-rated?limit=${limit}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    getMostLiked: async (limit: number = 15): Promise<Story[]> => {
        const response = await apiClient.get<Story[]>(`/stories/homepage/most-liked?limit=${limit}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    // Like/Unlike
    likeStory: async (storyId: string): Promise<{ id: string; userId: string; storyId: string; createdAt: string }> => {
        const response = await apiClient.post<{ id: string; userId: string; storyId: string; createdAt: string }>(`/stories/${storyId}/like`);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as { id: string; userId: string; storyId: string; createdAt: string };
        }
        return (response.data as unknown as { id: string; userId: string; storyId: string; createdAt: string });
    },

    unlikeStory: async (storyId: string): Promise<{ success: boolean }> => {
        const response = await apiClient.delete<{ success: boolean }>(`/stories/${storyId}/like`);
        return response.data;
    },

    checkLiked: async (storyId: string): Promise<{ isLiked: boolean }> => {
        const response = await apiClient.get<{ isLiked: boolean }>(`/stories/${storyId}/like`);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'isLiked' in (response.data as any).data) {
            return (response.data as any).data as { isLiked: boolean };
        }
        return (response.data as unknown as { isLiked: boolean });
    },

    getLikedStories: async (query?: { page?: number; limit?: number }): Promise<{ data: Array<{ id: string; userId: string; storyId: string; createdAt: string; story: Story }>; meta: any }> => {
        const params = new URLSearchParams();
        if (query?.page) params.append('page', String(query.page));
        if (query?.limit) params.append('limit', String(query.limit));
        const response = await apiClient.get<{ data: Array<{ id: string; userId: string; storyId: string; createdAt: string; story: Story }>; meta: any }>(`/stories/users/me/liked?${params.toString()}`);
        if ((response.data as any)?.data?.data && (response.data as any)?.data?.meta) {
            return (response.data as any).data as { data: Array<{ id: string; userId: string; storyId: string; createdAt: string; story: Story }>; meta: any };
        }
        return (response.data as unknown as { data: Array<{ id: string; userId: string; storyId: string; createdAt: string; story: Story }>; meta: any });
    },
};

