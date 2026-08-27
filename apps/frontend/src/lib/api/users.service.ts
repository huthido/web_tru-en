import { apiClient } from './client';
import { ApiResponse } from './client';

export interface User {
  id: string;
  email: string;
  username: string;
  profileSlug?: string | null;
  displayName?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    authoredStories: number;
    comments: number;
    favorites: number;
    follows: number;
  };
}

export interface AdminUpdateUserRequest {
  role?: string;
  isActive?: boolean;
  displayName?: string;
  bio?: string;
}

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserStats {
  storiesCount: number;
  followsCount: number;
  favoritesCount: number;
  readingHistoryCount: number;
  commentsCount: number;
  ratingsCount: number;
  totalViews: number;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  _count: {
    authoredStories: number;
    follows: number;
    favorites: number;
    readingHistory: number;
  };
}

export interface AdminUserDetail {
  id: string;
  email: string;
  username: string;
  profileSlug?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  provider?: string | null;
  ttsSubscriptionExpiresAt?: string | null;
  ttsVoicePreset?: string | null;
  createdAt: string;
  updatedAt: string;
  wallet: { balance: number; purchasedBalance: number; earnedBalance: number; isLocked: boolean };
  stats: {
    authoredStories: number;
    publishedStories: number;
    totalStoryViews: number;
    authorFollowers: number;
    followingStories: number;
    favorites: number;
    comments: number;
    ratings: number;
    chapterPurchases: number;
    storyPurchases: number;
    itemPurchases: number;
    itemsCreated: number;
    totalSpent: number;
    donationsReceived: number;
    donationsSent: number;
    withdrawalRequests: number;
  };
}

export const usersService = {
  /**
   * Get all users (admin only)
   */
  getAll: async (query?: UsersQuery): Promise<{ data: User[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.search) params.append('search', query.search);
    if (query?.role) params.append('role', query.role);
    if (query?.isActive !== undefined) params.append('isActive', String(query.isActive));

    const response = await apiClient.get<{ data: User[]; meta: any }>(`/users?${params.toString()}`);
    if ((response.data as any)?.data?.data && (response.data as any)?.data?.meta) {
      return (response.data as any).data as { data: User[]; meta: any };
    }
    return (response.data as unknown as { data: User[]; meta: any });
  },

  /**
   * Update user (admin only)
   */
  getAdminDetail: async (id: string): Promise<AdminUserDetail> => {
    const response = await apiClient.get(`/users/admin/detail/${id}`);
    return response.data as unknown as AdminUserDetail;
  },

  update: async (id: string, data: AdminUpdateUserRequest): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data as any;
  },

  /**
   * Get user stats (current user)
   */
  getStats: async (): Promise<UserStats> => {
    const response = await apiClient.get<UserStats>('/users/me/stats');
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'storiesCount' in (response.data as any).data) {
      return (response.data as any).data as UserStats;
    }
    return (response.data as unknown as UserStats);
  },

  /**
   * Get public profile
   */
  getPublicProfile: async (userId: string): Promise<PublicProfile> => {
    const response = await apiClient.get<PublicProfile>(`/users/${userId}/public`);
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as PublicProfile;
    }
    return (response.data as unknown as PublicProfile);
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: { displayName?: string; avatar?: string; bio?: string; profileSlug?: string }): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch<User>('/users/me', data);
    return response.data as any;
  },

  /**
   * Upload avatar
   */
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatar: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ avatar: string }>('/users/me/avatar/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // apiClient already unwrapped the envelope → response.data is { avatar }.
    return { success: true, data: response.data as any } as ApiResponse<{ avatar: string }>;
  },
};
