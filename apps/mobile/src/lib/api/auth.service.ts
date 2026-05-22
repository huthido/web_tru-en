import type { UserRole } from '@web-truyen/shared';
import { apiClient, tokenStorage } from './client';

/** Slim profile returned by /auth/login and /auth/me. */
export interface AuthUser {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    role: UserRole;
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
            const res = await apiClient.get<{ user: AuthUser }>('/auth/me');
            // GET /auth/me wraps the profile as { data: { user } } — unwrap the
            // envelope, then the `.user` nesting (fall back defensively).
            const payload = (res.data.data ?? res.data) as { user?: AuthUser } | AuthUser;
            return ((payload as { user?: AuthUser })?.user ?? (payload as AuthUser)) ?? null;
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
