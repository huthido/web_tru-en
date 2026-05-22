import { apiClient, unwrap } from './client';
import { normalizePage } from './types';
import type { BuyResponse, Paged, Story, StoryAccessInfo, StoryQueryParams } from './types';

/** Build a fetcher for one of the curated homepage lists. */
function homepageList(kind: string) {
    return async (limit = 15): Promise<Story[]> => {
        const res = await apiClient.get(`/stories/homepage/${kind}`, { params: { limit } });
        return unwrap<Story[]>(res) ?? [];
    };
}

export const StoriesApi = {
    /** Paginated story list with search / category / sort filters. */
    async list(params: StoryQueryParams = {}): Promise<Paged<Story>> {
        const { categories, ...rest } = params;
        const res = await apiClient.get('/stories', {
            params: {
                ...rest,
                categories: categories && categories.length ? categories.join(',') : undefined,
            },
        });
        return normalizePage<Story>(unwrap(res));
    },

    /** Story detail by slug or id — includes the published `chapters` array. */
    async getBySlug(slugOrId: string): Promise<Story> {
        const res = await apiClient.get(`/stories/${slugOrId}`);
        return unwrap<Story>(res);
    },

    newest: homepageList('newest'),
    bestOfMonth: homepageList('best-of-month'),
    recommended: homepageList('recommended'),
    topRated: homepageList('top-rated'),
    mostLiked: homepageList('most-liked'),

    async getAccess(slug: string): Promise<StoryAccessInfo> {
        const res = await apiClient.get(`/stories/${slug}/access`);
        return unwrap<StoryAccessInfo>(res);
    },

    async buy(slug: string): Promise<BuyResponse> {
        const res = await apiClient.post(`/stories/${slug}/buy`);
        return unwrap<BuyResponse>(res);
    },

    async checkLiked(storyId: string): Promise<boolean> {
        const res = await apiClient.get(`/stories/${storyId}/like`);
        return unwrap<{ isLiked: boolean }>(res)?.isLiked ?? false;
    },

    async like(storyId: string): Promise<void> {
        await apiClient.post(`/stories/${storyId}/like`);
    },

    async unlike(storyId: string): Promise<void> {
        await apiClient.delete(`/stories/${storyId}/like`);
    },
};
