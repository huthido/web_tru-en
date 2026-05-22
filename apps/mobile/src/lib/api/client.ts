import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Bearer-token API client for the mobile app.
 *
 * Why different from the web frontend's client?
 * - Web uses cookie-based auth (`withCredentials: true`) — works because the
 *   browser auto-attaches the HttpOnly refresh cookie.
 * - Mobile has no cookie jar — we persist accessToken + refreshToken in
 *   `expo-secure-store` (encrypted) and inject `Authorization: Bearer <jwt>`
 *   on every request. Refresh is an explicit POST that swaps the pair.
 *
 * Single-flight refresh: while one refresh is in progress, concurrent 401s
 * queue and resume with the new token. Prevents the multi-refresh storm
 * described in apps/frontend/src/lib/api/client.ts.
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Resolved API base URL — includes the `/api` suffix, e.g.
 * `http://10.0.2.2:3009/api`. Sourced from app.config.ts → extra.apiUrl.
 */
export const API_BASE_URL: string =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    'http://10.0.2.2:3009/api';

/** Unwrap the `{ success, data, timestamp }` envelope to the inner payload. */
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
    return (res.data?.data ?? res.data) as T;
}

const ACCESS_TOKEN_KEY = 'webtruyen.accessToken';
const REFRESH_TOKEN_KEY = 'webtruyen.refreshToken';

export const tokenStorage = {
    async getAccess(): Promise<string | null> {
        try { return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY); } catch { return null; }
    },
    async getRefresh(): Promise<string | null> {
        try { return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY); } catch { return null; }
    },
    async setPair(access: string, refresh: string) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    },
    async clear() {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },
};

/** Hook callers can register so the auth context can react to a forced logout. */
let onAuthFailureHandler: (() => void) | null = null;
export function registerAuthFailureHandler(handler: () => void) {
    onAuthFailureHandler = handler;
}

class ApiClient {
    private client: AxiosInstance;
    private isRefreshing = false;
    private refreshSubscribers: Array<(token: string | null) => void> = [];

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
            // X-Client-Type tells the backend CookieInterceptor to keep the
            // accessToken/refreshToken in the response body (mobile has no
            // cookie jar) instead of stripping them into HttpOnly cookies.
            headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'mobile' },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.client.interceptors.request.use(async (config) => {
            const token = await tokenStorage.getAccess();
            if (token) {
                config.headers = config.headers ?? {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            }
            return config;
        });

        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                if (!error.response || error.response.status !== 401 || originalRequest._retry) {
                    return Promise.reject(error);
                }

                // Don't try to refresh for auth endpoints themselves.
                const skip = ['/auth/login', '/auth/register', '/auth/refresh'];
                if (skip.some((p) => originalRequest?.url?.includes(p))) {
                    return Promise.reject(error);
                }

                if (this.isRefreshing) {
                    // Queue until the in-flight refresh resolves.
                    return new Promise((resolve, reject) => {
                        this.refreshSubscribers.push((newToken) => {
                            if (!newToken) return reject(error);
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            resolve(this.client(originalRequest));
                        });
                    });
                }

                this.isRefreshing = true;
                originalRequest._retry = true;

                try {
                    const refreshToken = await tokenStorage.getRefresh();
                    if (!refreshToken) throw new Error('No refresh token');

                    const refreshRes = await axios.post(
                        `${this.client.defaults.baseURL}/auth/refresh`,
                        { refreshToken },
                        // Bare axios call — must set X-Client-Type itself so the
                        // backend returns the new accessToken in the body.
                        { timeout: 15000, headers: { 'X-Client-Type': 'mobile' } },
                    );

                    const payload = refreshRes.data?.data ?? refreshRes.data;
                    const newAccess: string | undefined = payload?.accessToken;
                    // Backend's /auth/refresh does not rotate the refresh token,
                    // so fall back to the existing one — always a string here.
                    const newRefresh: string = payload?.refreshToken ?? refreshToken;
                    if (!newAccess) throw new Error('Refresh returned no accessToken');

                    await tokenStorage.setPair(newAccess, newRefresh);
                    this.notifyRefreshed(newAccess);

                    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                    return this.client(originalRequest);
                } catch (refreshError) {
                    this.notifyRefreshed(null);
                    await tokenStorage.clear();
                    onAuthFailureHandler?.();
                    return Promise.reject(refreshError);
                } finally {
                    this.isRefreshing = false;
                }
            },
        );
    }

    private notifyRefreshed(token: string | null) {
        this.refreshSubscribers.forEach((cb) => cb(token));
        this.refreshSubscribers = [];
    }

    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
        return this.client.get<ApiResponse<T>>(url, config);
    }
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
        return this.client.post<ApiResponse<T>>(url, data, config);
    }
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
        return this.client.patch<ApiResponse<T>>(url, data, config);
    }
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
        return this.client.delete<ApiResponse<T>>(url, config);
    }
}

export const apiClient = new ApiClient();
