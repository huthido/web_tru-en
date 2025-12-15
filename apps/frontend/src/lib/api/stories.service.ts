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
    status: string;
    isPublished: boolean;
    viewCount: number;
    likeCount: number;
    followCount: number;
    rating: number;
    ratingCount: number;
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
    status?: string;
    isPublished?: boolean;
    country?: string;
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
        const response = await apiClient.get<PaginatedResponse<Story>>('/stories', {
            params,
        });
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

    getBySlug: async (slug: string): Promise<ApiResponse<Story> | Story> => {
        const response = await apiClient.get<Story | ApiResponse<Story>>(`/stories/${slug}`);
        const data = response.data as any;
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
};

