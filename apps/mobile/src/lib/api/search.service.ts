import { apiClient, unwrap } from './client';
import { normalizePage } from './types';
import type { Paged, SearchSuggestion, Story } from './types';

export interface SearchOptions {
    page?: number;
    limit?: number;
    categories?: string[];
    status?: string;
    sortBy?: string;
}

export const SearchApi = {
    /** Full-text story search. `q` must be >= 2 chars. */
    async search(q: string, opts: SearchOptions = {}): Promise<Paged<Story>> {
        const { categories, ...rest } = opts;
        const res = await apiClient.get('/search', {
            params: {
                q,
                ...rest,
                categories: categories && categories.length ? categories.join(',') : undefined,
            },
        });
        return normalizePage<Story>(unwrap(res));
    },

    async suggestions(q: string, limit = 10): Promise<SearchSuggestion[]> {
        const res = await apiClient.get('/search/suggestions', { params: { q, limit } });
        return unwrap<SearchSuggestion[]>(res) ?? [];
    },
};
