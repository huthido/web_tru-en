import { apiClient, unwrap } from './client';
import type { Category } from './types';

export const CategoriesApi = {
    async list(): Promise<Category[]> {
        const res = await apiClient.get('/categories');
        return unwrap<Category[]>(res) ?? [];
    },
};
