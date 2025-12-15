import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    categoriesService,
    Category,
    CreateCategoryRequest,
    UpdateCategoryRequest,
} from '../categories.service';

export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await categoriesService.getAll();
            // Handle both ApiResponse format and direct array
            return Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        },
        staleTime: 30 * 60 * 1000, // 30 minutes (categories don't change often)
    });
};

export const useCategory = (slug: string) => {
    return useQuery({
        queryKey: ['category', slug],
        queryFn: async () => {
            const response = await categoriesService.getBySlug(slug);
            return response.data;
        },
        enabled: !!slug,
        staleTime: 30 * 60 * 1000,
    });
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCategoryRequest) =>
            categoriesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
            categoriesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['category'] });
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => categoriesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
};

