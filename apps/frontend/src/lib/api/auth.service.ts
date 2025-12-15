import { apiClient } from './client';
import { ApiResponse } from './client';

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
  message?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  role: string;
  emailVerified: boolean;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    authoredStories: number;
    follows: number;
    favorites: number;
    readingHistory: number;
  };
}

export const authService = {
  register: async (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ accessToken: string }>> => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<{ user: AuthResponse['user'] }>> => {
    const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },
};

