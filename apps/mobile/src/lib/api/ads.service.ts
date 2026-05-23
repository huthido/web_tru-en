import { apiClient, unwrap } from './client';

export type AdType = 'POPUP' | 'BANNER' | 'SIDEBAR';

export type AdPosition = 'TOP' | 'BOTTOM' | 'SIDEBAR_LEFT' | 'SIDEBAR_RIGHT' | 'INLINE';

export interface Ad {
    id: string;
    title?: string | null;
    description?: string | null;
    imageUrl: string;
    linkUrl?: string | null;
    type: AdType;
    position: AdPosition;
    isActive: boolean;
    startDate?: string | null;
    endDate?: string | null;
    clickCount: number;
    viewCount: number;
    popupInterval?: number | null;
    createdAt: string;
    updatedAt: string;
}

export const AdsApi = {
    /** Public — list active ads filtered by type/position. */
    async listActive(type?: AdType, position?: AdPosition): Promise<Ad[]> {
        const res = await apiClient.get('/ads/active', { params: { type, position } });
        return unwrap<Ad[]>(res) ?? [];
    },

    /** Public — track an impression (fire-and-forget). Backend dedups by IP+UA. */
    async trackImpression(adId: string): Promise<void> {
        try {
            await apiClient.post(`/ads/${adId}/impression`);
        } catch {
            // Silently swallow — analytics misses must not affect UX.
        }
    },

    /** Public — track a click. */
    async trackClick(adId: string): Promise<void> {
        try {
            await apiClient.post(`/ads/${adId}/track-click`);
        } catch {
            // Silently swallow.
        }
    },
};
