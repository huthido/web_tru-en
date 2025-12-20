import { apiClient } from './client';
import { Story } from './stories.service';

export interface SearchResult {
  data: Story[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  authorName?: string | null;
}

export const searchService = {
  async search(query: string, options?: {
    page?: number;
    limit?: number;
    categories?: string[];
    status?: string;
    sortBy?: string;
  }): Promise<SearchResult> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.categories?.length) params.append('categories', options.categories.join(','));
    if (options?.status) params.append('status', options.status);
    if (options?.sortBy) params.append('sortBy', options.sortBy);

    const response = await apiClient.get<SearchResult>(`/search?${params.toString()}`);
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && (response.data as any)?.meta) {
      return (response.data as any).data as SearchResult;
    }
    // If direct response
    if ((response.data as any)?.meta) {
      return (response.data as unknown as SearchResult);
    }
    // Fallback
    return (response.data as unknown as SearchResult);
  },

  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const response = await apiClient.get(`/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);

      // Debug: log response structure (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log('Suggestions API Response:', response.data);
      }

      // Check if direct array response first (most common case)
      if (Array.isArray(response.data)) {
        return response.data;
      }

      // Handle ApiResponse wrapper (if wrapped in { success, data, ... })
      if (response.data && response.data.success !== undefined && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      // Fallback
      return [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  },
};

