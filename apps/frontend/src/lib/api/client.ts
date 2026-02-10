import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(success: boolean) => void> = [];

  constructor() {
    // 🍎 iOS Safari Fix: Use relative path in production to avoid cross-origin cookies
    // In production: Frontend will proxy /api to backend via Next.js rewrites
    // In development: Use full backend URL
    const isDevelopment = process.env.NODE_ENV === 'development';
    const apiUrl = isDevelopment
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
      : ''; // Use relative path in production

    // Ensure baseURL ends with /api since backend has global prefix 'api'
    const baseURL = isDevelopment
      ? (apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`)
      : '/api'; // Relative path - will be proxied by Next.js

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Cookies are automatically sent with withCredentials: true
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 🔥 FIXED: Simplified response interceptor - no more race conditions
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 - Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Skip refresh for login/register/refresh endpoints
          const skipRefreshPaths = ['/auth/login', '/auth/register', '/auth/refresh'];
          const isSkipPath = skipRefreshPaths.some(path => originalRequest?.url?.includes(path));

          if (isSkipPath) {
            return Promise.reject(error);
          }

          // 🔥 FIX: Prevent multiple refresh requests
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            originalRequest._retry = true;

            try {
              // Try to refresh token
              const refreshResponse = await axios.post(
                `${this.client.defaults.baseURL}/auth/refresh`,
                {},
                { withCredentials: true }
              );

              if (refreshResponse.data?.success) {
                this.isRefreshing = false;
                // Notify all subscribers
                this.onRefreshSuccess();
                // Retry original request
                return this.client(originalRequest);
              } else {
                // Refresh returned success: false
                throw new Error('Refresh failed');
              }
            } catch (refreshError) {
              this.isRefreshing = false;
              this.onRefreshFailure();
              // 🔥 Only logout on refresh failure
              this.handleAuthFailure();
              return Promise.reject(refreshError);
            }
          } else {
            // 🔥 Queue requests while refreshing
            return new Promise((resolve, reject) => {
              this.subscribeTokenRefresh((success: boolean) => {
                if (success) {
                  resolve(this.client(originalRequest));
                } else {
                  reject(error);
                }
              });
            });
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // 🔥 NEW: Token refresh queue management
  private subscribeTokenRefresh(callback: (success: boolean) => void) {
    this.refreshSubscribers.push(callback);
  }

  private onRefreshSuccess() {
    this.refreshSubscribers.forEach(callback => callback(true));
    this.refreshSubscribers = [];
  }

  private onRefreshFailure() {
    this.refreshSubscribers.forEach(callback => callback(false));
    this.refreshSubscribers = [];
  }

  // 🔥 FIXED: Handle auth failure - only logout/redirect when truly unauthorized
  private handleAuthFailure() {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;

      // Define protected routes that require auth
      const protectedRoutes = ['/library', '/profile', '/history', '/favorites', '/follows', '/author'];
      const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

      // Define public routes that don't need auth
      const publicRoutes = ['/', '/login', '/register', '/maintenance', '/truyen/', '/stories/', '/search', '/categories', '/auth/'];
      const isPublicRoute = publicRoutes.some(route => currentPath === route || currentPath.startsWith(route));

      // 🔥 CRITICAL FIX: Always dispatch logout event to clear state
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'refresh_failed' } }));

      // Only redirect to login if on protected route
      if (isProtectedRoute && !isPublicRoute) {
        window.location.href = '/login';
      }
    }
  }

  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.get<ApiResponse<T>>(url, config);
  }

  public post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.post<ApiResponse<T>>(url, data, config);
  }

  public put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.put<ApiResponse<T>>(url, data, config);
  }

  public patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.patch<ApiResponse<T>>(url, data, config);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.delete<ApiResponse<T>>(url, config);
  }
}

export const apiClient = new ApiClient();