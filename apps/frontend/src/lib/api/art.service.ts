import { apiClient } from './client';

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

export const artService = {
  getFeed: async (cursor?: string, limit = 20): Promise<FeedResponse> => {
    const r = await apiClient.get<FeedResponse>('/art/posts', { params: { cursor, limit } });
    return r.data as unknown as FeedResponse;
  },

  createPost: async (data: { imageUrl: string; caption?: string; width?: number; height?: number }): Promise<ArtPost> => {
    const r = await apiClient.post<ArtPost>('/art/posts', data);
    return r.data as unknown as ArtPost;
  },

  deletePost: async (id: string) => {
    const r = await apiClient.delete(`/art/posts/${id}`);
    return r.data;
  },

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const r = await apiClient.post<{ url: string }>('/art/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data as unknown as { url: string };
  },

  toggleLike: async (postId: string): Promise<{ liked: boolean }> => {
    const r = await apiClient.post<{ liked: boolean }>(`/art/posts/${postId}/like`);
    return r.data as unknown as { liked: boolean };
  },

  getComments: async (postId: string, cursor?: string): Promise<CommentsResponse> => {
    const r = await apiClient.get<CommentsResponse>(`/art/posts/${postId}/comments`, { params: { cursor } });
    return r.data as unknown as CommentsResponse;
  },

  addComment: async (postId: string, content: string): Promise<ArtComment> => {
    const r = await apiClient.post<ArtComment>(`/art/posts/${postId}/comments`, { content });
    return r.data as unknown as ArtComment;
  },

  deleteComment: async (id: string) => {
    const r = await apiClient.delete(`/art/comments/${id}`);
    return r.data;
  },

  getStories: async (): Promise<ArtStory[]> => {
    const r = await apiClient.get<ArtStory[]>('/art/stories');
    return (r.data as unknown as ArtStory[]) ?? [];
  },

  createStory: async (file: File): Promise<ArtStory> => {
    const form = new FormData();
    form.append('file', file);
    const r = await apiClient.post<ArtStory>('/art/stories', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data as unknown as ArtStory;
  },

  viewStory: async (id: string) => {
    const r = await apiClient.post(`/art/stories/${id}/view`);
    return r.data;
  },
};
