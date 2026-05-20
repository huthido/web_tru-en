import { apiClient, tokenStorage } from './client';

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    role: 'USER' | 'AUTHOR' | 'ADMIN';
}

export interface LoginPayload {
    emailOrUsername: string;
    password: string;
}

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}

export const AuthApi = {
    async login(payload: LoginPayload): Promise<AuthUser> {
        const res = await apiClient.post<LoginResponse>('/auth/login', {
            emailOrUsername: payload.emailOrUsername,
            password: payload.password,
        });
        const data = (res.data.data ?? (res.data as any)) as LoginResponse;
        if (!data?.accessToken) throw new Error('Login returned no accessToken');
        await tokenStorage.setPair(data.accessToken, data.refreshToken);
        return data.user;
    },

    async me(): Promise<AuthUser | null> {
        try {
            const res = await apiClient.get<AuthUser>('/auth/me');
            return (res.data.data ?? (res.data as any)) as AuthUser;
        } catch {
            return null;
        }
    },

    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // Even if the backend call fails, clear local tokens — UI must log out.
        }
        await tokenStorage.clear();
    },
};
