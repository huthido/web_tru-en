import { apiClient, unwrap } from './client';

export type AdType = 'POPUP' | 'BANNER' | 'SIDEBAR';

export type AdPosition = 'TOP' | 'BOTTOM' | 'SIDEBAR_LEFT' | 'SIDEBAR_RIGHT' | 'INLINE';

export type AdSourceType =
    | 'SELF_SERVED'
    | 'GOOGLE_ADSENSE'
    | 'GOOGLE_ADMOB'
    | 'FAN'
    | 'CUSTOM_SCRIPT';

export interface AdNetworkConfig {
    adUnitId?: string;
    format?: string;
    placementId?: string;
    html?: string;
}

export interface Ad {
    id: string;
    title?: string | null;
    description?: string | null;
    imageUrl: string;
    linkUrl?: string | null;
    type: AdType;
    position: AdPosition;
    sourceType: AdSourceType;
    networkConfig?: AdNetworkConfig | null;
    platform?: string | null;
    isActive: boolean;
    startDate?: string | null;
    endDate?: string | null;
    clickCount: number;
    viewCount: number;
    popupInterval?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdsConfig {
    adsEnabled: boolean;
    consentRequired: boolean;
    googleAdsensePublisherId: string | null;
    admobAndroidAppId: string | null;
    admobIosAppId: string | null;
    fanPlacementId: string | null;
}

export const AdsApi = {
    /** Public — list active ads filtered by type/position. Mobile pass platform=mobile để bỏ AdSense/Custom HTML. */
    async listActive(type?: AdType, position?: AdPosition): Promise<Ad[]> {
        const res = await apiClient.get('/ads/active', { params: { type, position, platform: 'mobile' } });
        return unwrap<Ad[]>(res) ?? [];
    },

    /** Snapshot cấu hình ads — public IDs + flags. */
    async getConfig(): Promise<AdsConfig> {
        const res = await apiClient.get('/ads/config');
        return (
            unwrap<AdsConfig>(res) ?? {
                adsEnabled: false,
                consentRequired: true,
                googleAdsensePublisherId: null,
                admobAndroidAppId: null,
                admobIosAppId: null,
                fanPlacementId: null,
            }
        );
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
