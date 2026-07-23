import { apiClient, unwrap } from './client';

export interface AuthorPublicProfile {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    bio?: string | null;
    createdAt: string;
    publishedStoriesCount: number;
    totalViews: number;
    authorFollowerCount: number;
    isFollowing: boolean;
    isVerified: boolean;
}

export interface AuthorStoryItem {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    description?: string | null;
    status: string;
    accessType: string;
    viewCount: number;
    followCount: number;
    rating: number;
    ratingCount: number;
    updatedAt: string;
    lastChapterAt?: string | null;
}

export interface PaginatedStories {
    data: AuthorStoryItem[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface AuthorFollowerItem {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    followedAt: string;
}

export interface PaginatedFollowers {
    data: AuthorFollowerItem[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export const AuthorsService = {
    async getProfileByUsername(username: string): Promise<AuthorPublicProfile> {
        const res = await apiClient.get(`/users/by-username/${encodeURIComponent(username)}`);
        return unwrap<AuthorPublicProfile>(res);
    },
    async getProfileById(id: string): Promise<AuthorPublicProfile> {
        const res = await apiClient.get(`/users/${id}/public`);
        return unwrap<AuthorPublicProfile>(res);
    },
    async listStories(userId: string, page = 1, limit = 12): Promise<PaginatedStories> {
        const res = await apiClient.get(`/users/${userId}/stories?page=${page}&limit=${limit}`);
        return unwrap<PaginatedStories>(res);
    },
    async toggleFollow(authorId: string): Promise<{ following: boolean; followerCount: number }> {
        const res = await apiClient.post(`/users/${authorId}/follow-author`);
        return unwrap(res);
    },
    async followerCount(authorId: string): Promise<{ count: number }> {
        const res = await apiClient.get(`/users/${authorId}/author-followers/count`);
        return unwrap(res);
    },
    async isFollowing(authorId: string): Promise<{ following: boolean }> {
        const res = await apiClient.get(`/users/${authorId}/author-followers/me`);
        return unwrap(res);
    },
    /** Danh sách người theo dõi — backend chỉ cho chính chủ gọi. */
    async listFollowers(authorId: string, page = 1, limit = 20): Promise<PaginatedFollowers> {
        const res = await apiClient.get(`/users/${authorId}/author-followers?page=${page}&limit=${limit}`);
        return unwrap<PaginatedFollowers>(res);
    },
};
