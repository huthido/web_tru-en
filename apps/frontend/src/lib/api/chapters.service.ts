import { apiClient } from './client';
import { ApiResponse, PaginatedResponse } from './client';

export interface Chapter {
    id: string;
    storyId: string;
    title: string;
    slug: string;
    content: string;
    images: string[];
    order: number;
    isPublished: boolean;
    viewCount: number;
    wordCount: number;
    readingTime: number;
    uploaderId?: string;
    createdAt: string;
    updatedAt: string;
    story?: {
        id: string;
        title: string;
        slug: string;
        coverImage?: string;
    };
    uploader?: {
        id: string;
        username: string;
        displayName?: string;
        avatar?: string;
    };
}

export interface CreateChapterRequest {
    title: string;
    content: string;
    order?: number;
    images?: string[];
}

export interface UpdateChapterRequest {
    title?: string;
    content?: string;
    order?: number;
    images?: string[];
    isPublished?: boolean;
}

export const chaptersService = {
    getAll: async (
        storySlug: string
    ): Promise<ApiResponse<Chapter[]> | Chapter[]> => {
        const response = await apiClient.get<Chapter[] | ApiResponse<Chapter[]>>(
            `/stories/${storySlug}/chapters`
        );
        // Backend may return array directly or wrapped in ApiResponse
        const data = response.data;
        // If it's already an array, return it
        if (Array.isArray(data)) {
            return data;
        }
        // Otherwise, it's ApiResponse format
        return data as ApiResponse<Chapter[]>;
    },

    getBySlug: async (
        storySlug: string,
        chapterSlug: string
    ): Promise<ApiResponse<Chapter>> => {
        const response = await apiClient.get<Chapter>(
            `/stories/${storySlug}/chapters/${chapterSlug}`
        );
        return response.data;
    },

    create: async (
        storySlug: string,
        data: CreateChapterRequest
    ): Promise<ApiResponse<Chapter>> => {
        const response = await apiClient.post<Chapter>(
            `/stories/${storySlug}/chapters`,
            data
        );
        return response.data;
    },

    getById: async (
        storySlug: string,
        chapterId: string
    ): Promise<ApiResponse<Chapter> | Chapter> => {
        // First get all chapters to find by ID
        const allChapters = await chaptersService.getAll(storySlug);
        const chapters = Array.isArray(allChapters)
            ? allChapters
            : (Array.isArray((allChapters as any).data) ? (allChapters as any).data : []);
        const chapter = chapters.find((ch: Chapter) => ch.id === chapterId);
        if (!chapter) {
            throw new Error('Chapter not found');
        }
        return chapter;
    },

    update: async (
        storySlug: string,
        id: string,
        data: UpdateChapterRequest
    ): Promise<ApiResponse<Chapter>> => {
        const response = await apiClient.patch<Chapter>(`/stories/${storySlug}/chapters/${id}`, data);
        return response.data;
    },

    delete: async (storySlug: string, id: string): Promise<ApiResponse> => {
        const response = await apiClient.delete(`/stories/${storySlug}/chapters/${id}`);
        return response.data;
    },

    publish: async (storySlug: string, id: string): Promise<ApiResponse<Chapter>> => {
        const response = await apiClient.post<Chapter>(`/stories/${storySlug}/chapters/${id}/publish`);
        return response.data;
    },

    unpublish: async (storySlug: string, id: string): Promise<ApiResponse<Chapter>> => {
        const response = await apiClient.post<Chapter>(`/stories/${storySlug}/chapters/${id}/unpublish`);
        return response.data;
    },

    // Admin endpoints
    getAllForAdmin: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        storyId?: string;
        isPublished?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<PaginatedResponse<Chapter>> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.limit) queryParams.append('limit', String(params.limit));
        if (params?.search) queryParams.append('search', params.search);
        if (params?.storyId) queryParams.append('storyId', params.storyId);
        if (params?.isPublished !== undefined) queryParams.append('isPublished', String(params.isPublished));
        if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const response = await apiClient.get<PaginatedResponse<Chapter>>(
            `/admin/chapters?${queryParams.toString()}`
        );
        // Handle ApiResponse wrapper
        if (response.data && 'data' in response.data && 'meta' in response.data) {
            return response.data as unknown as PaginatedResponse<Chapter>;
        }
        // If wrapped in ApiResponse
        if ((response.data as any)?.data?.data && (response.data as any)?.data?.meta) {
            return (response.data as any).data as PaginatedResponse<Chapter>;
        }
        return (response.data as unknown as PaginatedResponse<Chapter>);
    },

    getChaptersStats: async (): Promise<{
        total: number;
        published: number;
        draft: number;
        totalViews: number;
    }> => {
        const response = await apiClient.get<any>('/admin/chapters/stats');

        // Handle ApiResponse wrapper (if exists)
        if (response.data?.success !== undefined && response.data?.data) {
            return response.data.data as {
                total: number;
                published: number;
                draft: number;
                totalViews: number;
            };
        }

        // Return direct data
        return (response.data as unknown) as {
            total: number;
            published: number;
            draft: number;
            totalViews: number;
        };
    },

    getChaptersChartData: async (days: number = 30): Promise<{
        labels: string[];
        data: number[];
    }> => {
        const response = await apiClient.get<any>(`/admin/chapters/chart-data?days=${days}`);

        // Handle ApiResponse wrapper (if exists)
        if (response.data?.success !== undefined && response.data?.data) {
            return response.data.data as {
                labels: string[];
                data: number[];
            };
        }

        // Return direct data
        return (response.data as unknown) as {
            labels: string[];
            data: number[];
        };
    },
};

