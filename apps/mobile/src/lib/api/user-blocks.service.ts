import { apiClient, unwrap } from './client';

export interface BlockedUser {
    id: string;
    createdAt: string;
    blocked: {
        id: string;
        username: string;
        displayName: string | null;
        avatar: string | null;
    };
}

export const UserBlocksApi = {
    async block(userId: string): Promise<void> {
        await apiClient.post(`/users/${userId}/block`);
    },

    async unblock(userId: string): Promise<void> {
        await apiClient.delete(`/users/${userId}/block`);
    },

    async listMyBlocks(): Promise<BlockedUser[]> {
        const res = await apiClient.get('/users/me/blocks');
        return unwrap<BlockedUser[]>(res) ?? [];
    },
};
