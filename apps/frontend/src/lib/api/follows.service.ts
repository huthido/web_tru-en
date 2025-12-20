import { apiClient } from './client';

export interface Follow {
  id: string;
  userId: string;
  storyId: string;
  createdAt: string;
  story?: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string;
    description?: string;
    authorName?: string;
    viewCount: number;
    followCount: number;
    rating: number;
    ratingCount: number;
    lastChapterAt?: string;
    isPublished: boolean;
    status: string;
  };
}

export interface FollowResponse {
  isFollowing: boolean;
}

export const followsService = {
  followStory: async (storyId: string): Promise<Follow> => {
    const response = await apiClient.post<Follow>(`/stories/${storyId}/follow`);
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Follow;
    }
    return (response.data as unknown as Follow);
  },

  unfollowStory: async (storyId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/stories/${storyId}/follow`);
    return response.data;
  },

  checkFollowing: async (storyId: string): Promise<FollowResponse> => {
    const response = await apiClient.get<FollowResponse>(`/stories/${storyId}/follow`);
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'isFollowing' in (response.data as any).data) {
      return (response.data as any).data as FollowResponse;
    }
    return (response.data as unknown as FollowResponse);
  },

  getMyFollows: async (query?: { page?: number; limit?: number }): Promise<{ data: Follow[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    const response = await apiClient.get<{ data: Follow[]; meta: any }>(`/users/me/follows?${params.toString()}`);
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data?.data && (response.data as any)?.data?.meta) {
      return (response.data as any).data as { data: Follow[]; meta: any };
    }
    return (response.data as unknown as { data: Follow[]; meta: any });
  },

  getStoryFollowers: async (storyId: string, query?: { page?: number; limit?: number }): Promise<{ data: Follow[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    const response = await apiClient.get<{ data: Follow[]; meta: any }>(`/stories/${storyId}/followers?${params.toString()}`);
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data?.data && (response.data as any)?.data?.meta) {
      return (response.data as any).data as { data: Follow[]; meta: any };
    }
    return (response.data as unknown as { data: Follow[]; meta: any });
  },
};

