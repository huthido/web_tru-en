import { apiClient } from './client';

export interface ApiResponse<T = any> {
    success?: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export enum AdType {
    POPUP = 'POPUP',
    BANNER = 'BANNER',
    SIDEBAR = 'SIDEBAR',
}

export enum AdPosition {
    TOP = 'TOP',
    BOTTOM = 'BOTTOM',
    SIDEBAR_LEFT = 'SIDEBAR_LEFT',
    SIDEBAR_RIGHT = 'SIDEBAR_RIGHT',
    INLINE = 'INLINE',
}

export interface Ad {
    id: string;
    title?: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
    type: AdType;
    position: AdPosition;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    clickCount: number;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        id: string;
        username: string;
        displayName?: string;
    };
}

export interface CreateAdRequest {
    title?: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
    type: AdType;
    position: AdPosition;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
}

export interface UpdateAdRequest extends Partial<CreateAdRequest> { }

export const adsService = {
    /**
     * Get active ads for display (public)
     */
    getActiveAds: async (type?: AdType, position?: AdPosition): Promise<Ad[]> => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (position) params.append('position', position);

        const response = await apiClient.get<Ad[] | ApiResponse<Ad[]>>(`/ads/active?${params.toString()}`);
        const data = response.data as any;
        if (Array.isArray(data)) {
            return data;
        }
        return (data as ApiResponse<Ad[]>).data || [];
    },

    /**
     * Get all ads (admin only)
     */
    getAll: async (query?: {
        type?: AdType;
        position?: AdPosition;
        isActive?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: Ad[]; meta: any }> => {
        const params = new URLSearchParams();
        if (query?.type) params.append('type', query.type);
        if (query?.position) params.append('position', query.position);
        if (query?.isActive !== undefined) params.append('isActive', String(query.isActive));
        if (query?.search) params.append('search', query.search);
        if (query?.page) params.append('page', String(query.page));
        if (query?.limit) params.append('limit', String(query.limit));

        const response = await apiClient.get<{ data: Ad[]; meta: any } | ApiResponse<{ data: Ad[]; meta: any }>>(`/ads?${params.toString()}`);
        const data = response.data as any;
        if (data && data.data && Array.isArray(data.data)) {
            return data;
        }
        // Fallback for old format
        if (Array.isArray(data)) {
            return { data, meta: { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
        }
        return (data as ApiResponse<{ data: Ad[]; meta: any }>).data || { data: [], meta: {} };
    },

    /**
     * Get single ad by ID (admin only)
     */
    getById: async (id: string): Promise<Ad> => {
        const response = await apiClient.get<Ad | ApiResponse<Ad>>(`/ads/${id}`);
        const data = response.data as any;
        if (data && data.id) {
            return data as Ad;
        }
        return (data as ApiResponse<Ad>).data as Ad;
    },

    /**
     * Create new ad (admin only)
     */
    create: async (data: CreateAdRequest): Promise<ApiResponse<Ad>> => {
        const response = await apiClient.post<Ad>('/ads', data);
        return response.data as any;
    },

    /**
     * Update ad (admin only)
     */
    update: async (id: string, data: UpdateAdRequest): Promise<ApiResponse<Ad>> => {
        const response = await apiClient.patch<Ad>(`/ads/${id}`, data);
        return response.data as any;
    },

    /**
     * Delete ad (admin only)
     */
    delete: async (id: string): Promise<ApiResponse> => {
        const response = await apiClient.delete(`/ads/${id}`);
        return response.data;
    },

    /**
     * Track ad view (public)
     */
    trackView: async (id: string): Promise<void> => {
        await apiClient.post(`/ads/${id}/view`);
    },

    /**
     * Track ad click (public)
     */
    trackClick: async (id: string): Promise<void> => {
        await apiClient.post(`/ads/${id}/click`);
    },

    /**
     * Upload ad image to Cloudinary (admin only)
     */
    uploadImage: async (file: File): Promise<ApiResponse<{ imageUrl: string }>> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ imageUrl: string }>(
            '/ads/upload-image',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data as any;
    },
};

