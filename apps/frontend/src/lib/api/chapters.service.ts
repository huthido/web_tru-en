import { apiClient } from './client';
import { ApiResponse } from './client';

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
        const allChapters = await this.getAll(storySlug);
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
};

