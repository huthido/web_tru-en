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

export enum AdSourceType {
    SELF_SERVED = 'SELF_SERVED',
    GOOGLE_ADSENSE = 'GOOGLE_ADSENSE',
    GOOGLE_ADMOB = 'GOOGLE_ADMOB',
    FAN = 'FAN',
    CUSTOM_SCRIPT = 'CUSTOM_SCRIPT',
}

export type AdPlatform = 'web' | 'mobile' | 'all';

export interface AdNetworkConfig {
    /** GOOGLE_ADSENSE: data-ad-slot. GOOGLE_ADMOB: ca-app-pub-X/Y. */
    adUnitId?: string;
    /** GOOGLE_ADSENSE: 'auto' | 'rectangle' | 'horizontal' | 'vertical'. */
    format?: string;
    /** GOOGLE_ADSENSE: data-full-width-responsive. */
    responsive?: boolean;
    /** FAN: placement ID. */
    placementId?: string;
    /** CUSTOM_SCRIPT: HTML / <script> raw. */
    html?: string;
}

/**
 * Cấu hình hiển thị runtime — override hardcode mặc định component:
 * heights → tailwind class per breakpoint, rotateInterval ms, maxStack số ad
 * stack đồng thời (sidebar), openInNewTab cho SELF_SERVED, customCss raw.
 */
export interface AdDisplayConfig {
    heights?: { base?: string; sm?: string; md?: string };
    rotateInterval?: number;
    maxStack?: number;
    openInNewTab?: boolean;
    customCss?: string;
    format?: string;
}

/** Quy tắc chèn INLINE banner — đếm theo đoạn văn `</p>`. */
export interface AdInlineRule {
    afterParagraph?: number; // chèn ad đầu tiên sau đoạn thứ N
    repeatEvery?: number; // sau đó lặp mỗi M đoạn
    maxOccurrences?: number | null; // tối đa K lần, null = không giới hạn
}

export interface AdSlotSummary {
    id: string;
    key: string;
    label: string;
    pageKey: string;
    position: AdPosition;
}

export interface AdSlotBinding {
    id: string;
    slotId: string;
    priority: number;
    slot?: AdSlotSummary;
}

export interface Ad {
    id: string;
    title?: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
    type: AdType;
    position: AdPosition;
    sourceType: AdSourceType;
    networkConfig?: AdNetworkConfig | null;
    displayConfig?: AdDisplayConfig | null;
    inlineRule?: AdInlineRule | null;
    platform?: AdPlatform | null;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    clickCount: number;
    viewCount: number;
    popupInterval?: number; // Number of chapters to read before showing popup (only for POPUP type)
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        id: string;
        username: string;
        displayName?: string;
    };
    slotBindings?: AdSlotBinding[];
}

export interface CreateAdRequest {
    title?: string;
    description?: string;
    imageUrl?: string;
    linkUrl?: string;
    popupInterval?: number;
    type: AdType;
    position: AdPosition;
    sourceType?: AdSourceType;
    networkConfig?: AdNetworkConfig;
    displayConfig?: AdDisplayConfig;
    inlineRule?: AdInlineRule;
    platform?: AdPlatform;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    /** Gắn ad vào các slot này (replace bindings cũ khi update). */
    slotIds?: string[];
}

export interface AdSlot {
    id: string;
    key: string;
    pageKey: string;
    position: AdPosition;
    label: string;
    maxAds: number;
    enabled: boolean;
    adType?: AdType | null;
    platform?: AdPlatform | null;
    createdAt: string;
    updatedAt: string;
    _count?: { bindings: number };
}

export interface CreateAdSlotRequest {
    key: string;
    pageKey: string;
    position: AdPosition;
    label: string;
    maxAds?: number;
    enabled?: boolean;
    adType?: AdType;
    platform?: AdPlatform;
}

/** Snapshot config từ GET /ads/config — dùng để init network SDK + consent. */
export interface AdsConfig {
    adsEnabled: boolean;
    consentRequired: boolean;
    googleAdsensePublisherId: string | null;
    admobAndroidAppId: string | null;
    admobIosAppId: string | null;
    fanPlacementId: string | null;
}

export interface UpdateAdRequest extends Partial<CreateAdRequest> { }

export interface AdAnalytics {
    ad: {
        id: string;
        title?: string | null;
        type: AdType;
        position: AdPosition;
        campaign: { id: string; name: string } | null;
    };
    stats: {
        totalImpressions: number;
        totalClicks: number;
        ctr: number;
        deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
    };
    dailyData: Array<{ date: string; impressions: number; clicks: number; ctr: number }>;
    hourlyData: Array<{ hour: number; impressions: number; clicks: number }>;
}

export const adsService = {
    /**
     * Get active ads for display (public)
     */
    getActiveAds: async (type?: AdType, position?: AdPosition, platform: 'web' | 'mobile' = 'web'): Promise<Ad[]> => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (position) params.append('position', position);
        params.append('platform', platform);

        const response = await apiClient.get<Ad[] | ApiResponse<Ad[]>>(`/ads/active?${params.toString()}`);
        const responseData = response.data as any;
        
        // Handle ApiResponse format: { success: true, data: [...], timestamp: ... }
        if (responseData && typeof responseData === 'object') {
            if (responseData.data && Array.isArray(responseData.data)) {
                return responseData.data;
            }
            // If data is directly an array
            if (Array.isArray(responseData)) {
                return responseData;
            }
        }
        
        return [];
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
     * Get analytics for one ad (admin only) — daily / hourly / device breakdown.
     */
    getAnalytics: async (
        id: string,
        dateRange?: { from: string; to: string },
    ): Promise<AdAnalytics> => {
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('from', dateRange.from);
        if (dateRange?.to) params.append('to', dateRange.to);
        const qs = params.toString();
        const response = await apiClient.get<AdAnalytics | ApiResponse<AdAnalytics>>(
            `/ads/${id}/analytics${qs ? `?${qs}` : ''}`,
        );
        const data = response.data as any;
        if (data && data.stats) return data as AdAnalytics;
        return (data as ApiResponse<AdAnalytics>).data as AdAnalytics;
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
        // apiClient already unwrapped the envelope → response.data is { imageUrl }.
        return { success: true, data: response.data as any } as ApiResponse<{ imageUrl: string }>;
    },

    /** Snapshot cấu hình ads (public IDs + flags). Client cache 10 phút. */
    getConfig: async (): Promise<AdsConfig> => {
        const response = await apiClient.get<AdsConfig | ApiResponse<AdsConfig>>('/ads/config');
        const data = response.data as any;
        if (data && typeof data.adsEnabled === 'boolean') return data as AdsConfig;
        return (data as ApiResponse<AdsConfig>).data as AdsConfig;
    },
};

// ============================================================================
// AdSlot service — quản lý registry các vị trí ads + lookup ads của slot.
// ============================================================================

export const adSlotsService = {
    /** Admin: list tất cả slot có sẵn. */
    list: async (): Promise<AdSlot[]> => {
        const response = await apiClient.get<AdSlot[] | ApiResponse<AdSlot[]>>('/ad-slots');
        const data = response.data as any;
        if (Array.isArray(data)) return data;
        return (data as ApiResponse<AdSlot[]>).data ?? [];
    },

    /** Public: lookup 1 slot theo key (để biết enabled/position/maxAds). */
    getByKey: async (key: string): Promise<AdSlot> => {
        const response = await apiClient.get<AdSlot | ApiResponse<AdSlot>>(`/ad-slots/by-key/${key}`);
        const data = response.data as any;
        if (data && data.key) return data as AdSlot;
        return (data as ApiResponse<AdSlot>).data as AdSlot;
    },

    /**
     * Public: lookup ds ads active của 1 slot. Backend đã filter theo enabled,
     * isActive, date range, platform, adType — trả thẳng cho render.
     */
    getActiveAdsByKey: async (
        key: string,
        platform: 'web' | 'mobile' = 'web',
    ): Promise<{ slot: AdSlot | null; ads: Ad[] }> => {
        const response = await apiClient.get<
            { slot: AdSlot; ads: Ad[] } | ApiResponse<{ slot: AdSlot; ads: Ad[] }>
        >(`/ad-slots/by-key/${key}/active?platform=${platform}`);
        const data = response.data as any;
        if (data && Array.isArray(data?.ads)) return data;
        return (data as ApiResponse<{ slot: AdSlot; ads: Ad[] }>).data ?? { slot: null, ads: [] };
    },

    create: async (data: CreateAdSlotRequest): Promise<AdSlot> => {
        const response = await apiClient.post<AdSlot>('/ad-slots', data);
        const d = response.data as any;
        return d?.data ?? d;
    },

    update: async (id: string, data: Partial<CreateAdSlotRequest>): Promise<AdSlot> => {
        const response = await apiClient.patch<AdSlot>(`/ad-slots/${id}`, data);
        const d = response.data as any;
        return d?.data ?? d;
    },

    remove: async (id: string): Promise<ApiResponse> => {
        const response = await apiClient.delete(`/ad-slots/${id}`);
        return response.data;
    },
};

