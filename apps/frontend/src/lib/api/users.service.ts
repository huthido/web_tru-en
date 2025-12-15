import { apiClient } from './client';
import { ApiResponse } from './client';

export interface User {
  id: string;
  email: string;
  username: string;
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
    return response.data;
  },

  /**
   * Update user (admin only)
   */
  update: async (id: string, data: AdminUpdateUserRequest): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data as any;
  },
};
