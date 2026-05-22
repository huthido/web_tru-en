import { useQuery } from '@tanstack/react-query';
import { CategoriesApi } from '../api/categories.service';

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: () => CategoriesApi.list(),
        staleTime: 30 * 60_000,
    });
}
