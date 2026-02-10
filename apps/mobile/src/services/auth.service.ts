import apiClient, { setTokens, clearTokens } from './api';

export interface LoginDto {
    emailOrUsername: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterDto {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    displayName?: string;
}

export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatar: string | null;
    role: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    requiresVerification?: boolean;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: User;
}

class AuthService {
    async login(data: LoginDto): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/login', data);
        await setTokens(response.data.accessToken, response.data.refreshToken);
        return response.data;
    }

    async register(data: RegisterDto): Promise<RegisterResponse> {
        const response = await apiClient.post<RegisterResponse>('/auth/register', data);
        if (response.data.accessToken && response.data.refreshToken) {
            await setTokens(response.data.accessToken, response.data.refreshToken);
        }
        return response.data;
    }

    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout');
        } finally {
            await clearTokens();
        }
    }

    async getMe(): Promise<User> {
        const response = await apiClient.get<User>('/auth/me');
        return response.data;
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', {
            refreshToken,
        });
        return response.data;
    }
}

export const authService = new AuthService();
