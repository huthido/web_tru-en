import { apiClient, unwrap } from './client';

export interface ArtUser {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
}

export interface ArtPost {
    id: string;
    imageUrl: string;
    caption?: string | null;
    width?: number | null;
    height?: number | null;
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
    createdAt: string;
    user: ArtUser;
}

export interface ArtComment {
    id: string;
    content: string;
    createdAt: string;
    user: ArtUser;
}

export interface ArtStory {
    id: string;
    imageUrl: string;
    expiresAt: string;
    viewCount: number;
    seenByMe: boolean;
    createdAt: string;
    user: ArtUser;
}

export interface FeedResponse {
    items: ArtPost[];
    nextCursor?: string;
    hasMore: boolean;
}

export interface CommentsResponse {
    items: ArtComment[];
    nextCursor?: string;
    hasMore: boolean;
}

/** React Native file shape — uri-based, no browser File API. */
export interface RNFileLike {
    uri: string;
    name?: string;
    type?: string;
}

export const ArtApi = {
    async getFeed(cursor?: string, limit = 20): Promise<FeedResponse> {
        const res = await apiClient.get<FeedResponse>('/art/posts', { params: { cursor, limit } });
        return unwrap<FeedResponse>(res) ?? { items: [], hasMore: false };
    },

    async createPost(data: { imageUrl: string; caption?: string; width?: number; height?: number }): Promise<ArtPost> {
        const res = await apiClient.post<ArtPost>('/art/posts', data);
        return unwrap<ArtPost>(res);
    },

    async deletePost(id: string): Promise<void> {
        await apiClient.delete(`/art/posts/${id}`);
    },

    async uploadImage(file: RNFileLike): Promise<{ url: string }> {
        const form = new FormData();
        form.append('file', { uri: file.uri, name: file.name ?? 'photo.jpg', type: file.type ?? 'image/jpeg' } as any);
        const res = await apiClient.post<{ url: string }>('/art/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap<{ url: string }>(res);
    },

    async toggleLike(postId: string): Promise<{ liked: boolean }> {
        const res = await apiClient.post<{ liked: boolean }>(`/art/posts/${postId}/like`);
        return unwrap<{ liked: boolean }>(res);
    },

    async getComments(postId: string, cursor?: string): Promise<CommentsResponse> {
        const res = await apiClient.get<CommentsResponse>(`/art/posts/${postId}/comments`, { params: { cursor } });
        return unwrap<CommentsResponse>(res) ?? { items: [], hasMore: false };
    },

    async addComment(postId: string, content: string): Promise<ArtComment> {
        const res = await apiClient.post<ArtComment>(`/art/posts/${postId}/comments`, { content });
        return unwrap<ArtComment>(res);
    },

    async deleteComment(id: string): Promise<void> {
        await apiClient.delete(`/art/comments/${id}`);
    },

    async getStories(): Promise<ArtStory[]> {
        const res = await apiClient.get<ArtStory[]>('/art/stories');
        return unwrap<ArtStory[]>(res) ?? [];
    },

    async createStory(file: RNFileLike): Promise<ArtStory> {
        const form = new FormData();
        form.append('file', { uri: file.uri, name: file.name ?? 'story.jpg', type: file.type ?? 'image/jpeg' } as any);
        const res = await apiClient.post<ArtStory>('/art/stories', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap<ArtStory>(res);
    },

    async viewStory(id: string): Promise<void> {
        await apiClient.post(`/art/stories/${id}/view`);
    },
};
