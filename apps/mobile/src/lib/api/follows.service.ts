import { apiClient, unwrap } from './client';
import { normalizePage } from './types';
import type { Follow, Paged } from './types';

export const FollowsApi = {
    async follow(storyId: string): Promise<void> {
        await apiClient.post(`/stories/${storyId}/follow`);
    },

    async unfollow(storyId: string): Promise<void> {
        await apiClient.delete(`/stories/${storyId}/follow`);
    },

    async checkFollowing(storyId: string): Promise<boolean> {
        const res = await apiClient.get(`/stories/${storyId}/follow`);
        return unwrap<{ isFollowing: boolean }>(res)?.isFollowing ?? false;
    },

    async myFollows(page = 1, limit = 20): Promise<Paged<Follow>> {
        const res = await apiClient.get('/users/me/follows', { params: { page, limit } });
        return normalizePage<Follow>(unwrap(res));
    },
};
