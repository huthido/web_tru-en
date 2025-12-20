import { apiClient } from './client';
import { ApiResponse } from './client';

export interface Page {
    id: string;
    slug: string;
    title: string;
    content: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePageRequest {
    slug: string;
    title: string;
    content: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdatePageRequest {
    title?: string;
    content?: string;
    description?: string;
    isActive?: boolean;
}

export const pagesService = {
    getAll: async (): Promise<Page[]> => {
        const response = await apiClient.get<ApiResponse<Page[]>>('/pages');
        // Handle ApiResponse wrapper
        if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
            return (response.data as any).data as Page[];
        }
        if (Array.isArray(response.data)) {
            return response.data as Page[];
        }
        return [];
    },

    getBySlug: async (slug: string): Promise<Page> => {
        const response = await apiClient.get<Page>(`/pages/${slug}`);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Page;
        }
        return (response.data as unknown as Page);
    },

    create: async (data: CreatePageRequest): Promise<Page> => {
        const response = await apiClient.post<Page>('/pages', data);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Page;
        }
        return (response.data as unknown as Page);
    },

    update: async (slug: string, data: UpdatePageRequest): Promise<Page> => {
        const response = await apiClient.patch<Page>(`/pages/${slug}`, data);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Page;
        }
        return (response.data as unknown as Page);
    },

    delete: async (slug: string): Promise<void> => {
        await apiClient.delete(`/pages/${slug}`);
    },
};

