import { apiClient } from './client';
import { ApiResponse } from './client';

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    storyCategories?: Array<{
        story: {
            id: string;
            title: string;
            slug: string;
            coverImage?: string;
            viewCount: number;
            rating: number;
            author: {
                id: string;
                username: string;
                displayName?: string;
            };
        };
    }>;
}

export interface CreateCategoryRequest {
    name: string;
    description?: string;
}

export interface UpdateCategoryRequest {
    name?: string;
    description?: string;
}

export const categoriesService = {
    getAll: async (): Promise<ApiResponse<Category[]>> => {
        const response = await apiClient.get<Category[]>('/categories');
        return response.data;
    },

    getBySlug: async (slug: string): Promise<ApiResponse<Category>> => {
        const response = await apiClient.get<Category>(`/categories/${slug}`);
        return response.data;
    },

    create: async (
        data: CreateCategoryRequest
    ): Promise<ApiResponse<Category>> => {
        const response = await apiClient.post<Category>('/categories', data);
        return response.data;
    },

    update: async (
        id: string,
        data: UpdateCategoryRequest
    ): Promise<ApiResponse<Category>> => {
        const response = await apiClient.patch<Category>(`/categories/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse> => {
        const response = await apiClient.delete(`/categories/${id}`);
        return response.data;
    },
};

