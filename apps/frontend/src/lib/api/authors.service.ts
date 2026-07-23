import { apiClient } from './client';

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
  /** Tác giả đã mở khoá tính năng nâng cao (✓ verified badge). */
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

function unwrap<T>(res: any): T {
  const body = res?.data;
  return (body?.data !== undefined && body?.success !== undefined ? body.data : body) as T;
}

export const AuthorsService = {
  getProfileByUsername: async (username: string): Promise<AuthorPublicProfile> => {
    const res = await apiClient.get(`/users/by-username/${encodeURIComponent(username)}`);
    return unwrap<AuthorPublicProfile>(res);
  },

  getProfileById: async (id: string): Promise<AuthorPublicProfile> => {
    const res = await apiClient.get(`/users/${id}/public`);
    return unwrap<AuthorPublicProfile>(res);
  },

  listStories: async (
    userId: string,
    page = 1,
    limit = 12,
  ): Promise<PaginatedStories> => {
    const res = await apiClient.get(
      `/users/${userId}/stories?page=${page}&limit=${limit}`,
    );
    return unwrap<PaginatedStories>(res);
  },

  followToggle: async (
    authorId: string,
  ): Promise<{ following: boolean; followerCount: number }> => {
    const res = await apiClient.post(`/users/${authorId}/follow-author`);
    return unwrap(res);
  },

  followerCount: async (authorId: string): Promise<{ count: number }> => {
    const res = await apiClient.get(
      `/users/${authorId}/author-followers/count`,
    );
    return unwrap(res);
  },

  isFollowing: async (authorId: string): Promise<{ following: boolean }> => {
    const res = await apiClient.get(`/users/${authorId}/author-followers/me`);
    return unwrap(res);
  },

  /** Danh sách người theo dõi (chỉ chính chủ mới gọi được — backend chặn). */
  listFollowers: async (
    authorId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedFollowers> => {
    const res = await apiClient.get(
      `/users/${authorId}/author-followers?page=${page}&limit=${limit}`,
    );
    return unwrap<PaginatedFollowers>(res);
  },
};
