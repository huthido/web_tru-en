import { apiClient } from './client';
import { ApiResponse } from './client';

/**
 * apiClient already unwraps the backend's { success, data, timestamp } envelope,
 * so `response.data` here is the inner payload. The auth service's public
 * contract is ApiResponse<T> (callers read `.data` / `.success`), so we re-wrap
 * to keep that contract stable. Mirrors the backend ResponseInterceptor logic:
 * a payload that already carries `success` (e.g. logout/exchange bodies) is
 * passed through untouched.
 */
function asApiResponse<T = any>(payload: any): ApiResponse<T> {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload as ApiResponse<T>;
  }
  return {
    success: true,
    data: payload,
    timestamp: new Date().toISOString(),
  } as ApiResponse<T>;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Tạo mật khẩu lần đầu cho tài khoản Google chưa có mật khẩu. */
export interface SetPasswordRequest {
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
    /** false = tài khoản OAuth chưa tạo mật khẩu (chỉ có trong /auth/me). */
    hasPassword?: boolean;
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
  register: async (data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return asApiResponse(response.data);
  },

  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return asApiResponse(response.data);
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/logout');
    return asApiResponse(response.data);
  },

  refreshToken: async (): Promise<ApiResponse<{ accessToken: string }>> => {
    const response = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    return asApiResponse(response.data);
  },

  getMe: async (): Promise<ApiResponse<{ user: AuthResponse['user'] }>> => {
    const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
    return asApiResponse(response.data);
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/change-password', data);
    return asApiResponse(response.data);
  },

  setPassword: async (data: SetPasswordRequest): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/set-password', data);
    return asApiResponse(response.data);
  },

  updateEmail: async (email: string): Promise<ApiResponse<{ user: AuthResponse['user'] }>> => {
    const response = await apiClient.post<{ user: AuthResponse['user'] }>('/auth/update-email', { email });
    return asApiResponse(response.data);
  },

  exchange: async (code: string): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/exchange', { code });
    return asApiResponse(response.data);
  },

  completeEmail: async (code: string, email: string): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/complete-email', { code, email });
    return asApiResponse(response.data);
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return asApiResponse(response.data);
  },

  resetPassword: async (data: {
    token: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/reset-password', data);
    return asApiResponse(response.data);
  },
};

