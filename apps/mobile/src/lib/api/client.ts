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
        const baseURL =
            (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
            'http://localhost:3001/api';

        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
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
                        { timeout: 15000 },
                    );

                    const payload = refreshRes.data?.data ?? refreshRes.data;
                    const newAccess: string | undefined = payload?.accessToken;
                    const newRefresh: string | undefined = payload?.refreshToken ?? refreshToken;
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
