import { apiClient } from './client';

export interface Rating {
  id: string;
  userId: string;
  storyId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

export interface RatingsResponse {
  ratings: Rating[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRatingRequest {
  rating: number; // 1-5
}

export const ratingsService = {
  // Rate a story
  rateStory: async (storyId: string, data: CreateRatingRequest): Promise<Rating> => {
    const response = await apiClient.post<Rating>(
      `/ratings/stories/${storyId}`,
      data
    );
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Rating;
    }
    return (response.data as unknown as Rating);
  },

  // Get user's rating for a story
  getUserRating: async (storyId: string): Promise<number | null> => {
    const response = await apiClient.get<{ rating: number | null }>(
      `/ratings/stories/${storyId}`
    );
    if ((response.data as any)?.data?.rating !== undefined) {
      return (response.data as any).data.rating;
    }
    if ((response.data as any)?.rating !== undefined) {
      return (response.data as any).rating;
    }
    return null;
  },

  // Delete user's rating
  deleteRating: async (storyId: string): Promise<void> => {
    await apiClient.delete(`/ratings/stories/${storyId}`);
  },

  // Get all ratings for a story
  getStoryRatings: async (
    storyId: string,
    page?: number,
    limit?: number
  ): Promise<RatingsResponse> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<RatingsResponse>(
      `/ratings/stories/${storyId}/list?${params.toString()}`
    );
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'ratings' in (response.data as any).data) {
      return (response.data as any).data as RatingsResponse;
    }
    return (response.data as unknown as RatingsResponse);
  },
};

