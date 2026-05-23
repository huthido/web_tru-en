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

    /**
     * Self-delete tài khoản (Apple §5.1.1(v)). Sau khi gọi thành công, xoá
     * token local — caller nên đẩy user về Login screen.
     * Password chỉ bắt buộc nếu tài khoản có password (local hoặc đã reset).
     */
    async deleteAccount(password?: string): Promise<void> {
        await apiClient.delete('/users/me', {
            data: password ? { password } : {},
        });
        await tokenStorage.clear();
    },

    /**
     * Request a password-reset email. Backend returns a generic success
     * message regardless of whether the email exists (anti-enumeration).
     */
    async forgotPassword(email: string): Promise<void> {
        await apiClient.post('/auth/forgot-password', { email });
    },

    /**
     * Complete a password reset with the token from the email link.
     * Not used by any screen yet — kept for an eventual in-app deep-link flow.
     */
    async resetPassword(
        token: string,
        newPassword: string,
        confirmNewPassword: string,
    ): Promise<void> {
        await apiClient.post('/auth/reset-password', {
            token,
            newPassword,
            confirmNewPassword,
        });
    },

    /**
     * Sign in with Apple — POST identityToken (from expo-apple-authentication)
     * to backend. `fullName` is only provided by Apple on the first sign-in;
     * forward it once so backend can capture displayName.
     */
    async verifyApple(input: {
        identityToken: string;
        fullName?: { givenName?: string | null; familyName?: string | null };
    }): Promise<AuthUser> {
        const res = await apiClient.post<LoginResponse>('/auth/apple/verify', input);
        const data = (res.data.data ?? (res.data as any)) as LoginResponse;
        if (!data?.accessToken) throw new Error('Apple sign-in returned no accessToken');
        await tokenStorage.setPair(data.accessToken, data.refreshToken);
        return data.user;
    },
};
