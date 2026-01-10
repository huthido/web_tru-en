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

  constructor() {
    // Get base URL from env, default to localhost:3001
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Ensure baseURL ends with /api since backend has global prefix 'api'
    const baseURL = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;

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
        // No need to manually add token to headers
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Skip redirect for auth endpoints (login, register, refresh, me)
        // These endpoints handle their own errors and shouldn't trigger token refresh
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
          originalRequest?.url?.includes('/auth/register') ||
          originalRequest?.url?.includes('/auth/me') ||
          originalRequest?.url?.includes('/auth/refresh');

        // Handle 401 - Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Don't try to refresh for auth endpoints
          if (isAuthEndpoint) {
            return Promise.reject(error);
          }

          try {
            // Try to refresh token
            const refreshResponse = await axios.post(
              `${this.client.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            if (refreshResponse.data?.data?.accessToken) {
              // Retry original request
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - only redirect if we're on a protected route
            // Public routes (homepage, book details, reading, search, categories) don't need auth
            if (typeof window !== 'undefined' && !isAuthEndpoint) {
              const currentPath = window.location.pathname;

              // Define protected routes that require authentication
              const protectedRoutes = [
                '/library',
                '/profile',
                '/history',
                '/favorites',
                '/follows',
                '/author',
              ];

              // Define public routes that don't need authentication
              const isPublicRoute =
                currentPath === '/' ||
                currentPath === '/login' ||
                currentPath === '/register' ||
                currentPath === '/maintenance' ||
                currentPath.startsWith('/truyen/') ||
                currentPath.startsWith('/stories/') ||
                currentPath.startsWith('/search') ||
                currentPath.startsWith('/categories') ||
                currentPath.startsWith('/auth/');

              // Only redirect if we're on a protected route
              const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

              if (isProtectedRoute && !isPublicRoute) {
                window.location.href = '/login';
              }
              // For public routes, just reject the error - components will handle it gracefully
            }
            return Promise.reject(refreshError);
          }
        }

        // Handle 403 - Forbidden
        if (error.response?.status === 403) {
          // Could show a toast or redirect
          console.error('Access forbidden');
        }

        return Promise.reject(error);
      }
    );
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

