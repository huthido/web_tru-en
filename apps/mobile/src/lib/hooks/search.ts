import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchApi } from '../api/search.service';
import { StoriesApi } from '../api/stories.service';

const PAGE_SIZE = 20;

/**
 * Drives the Search screen. When `query` has >= 2 chars it runs a full-text
 * search; otherwise, if a `categorySlug` is selected, it browses that category.
 * Returns an infinite query so the screen can load more on scroll.
 */
export function useStorySearch(query: string, categorySlug?: string) {
    const trimmed = query.trim();
    const mode: 'search' | 'browse' = trimmed.length >= 2 ? 'search' : 'browse';

    return useInfiniteQuery({
        queryKey: ['story-search', mode, trimmed, categorySlug ?? ''],
        enabled: mode === 'search' || !!categorySlug,
        initialPageParam: 1,
        queryFn: ({ pageParam }) =>
            mode === 'search'
                ? SearchApi.search(trimmed, { page: pageParam, limit: PAGE_SIZE })
                : StoriesApi.list({
                      page: pageParam,
                      limit: PAGE_SIZE,
                      categories: categorySlug ? [categorySlug] : undefined,
                      sortBy: 'popular',
                  }),
        getNextPageParam: (last) =>
            last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
        staleTime: 30_000,
    });
}
