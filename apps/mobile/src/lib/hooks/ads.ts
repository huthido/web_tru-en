import { useQuery } from '@tanstack/react-query';
import { AdsApi, type AdPosition, type AdType, type AdsConfig } from '../api/ads.service';

const DEFAULT_CONFIG: AdsConfig = {
    adsEnabled: false,
    consentRequired: true,
    googleAdsensePublisherId: null,
    admobAndroidAppId: null,
    admobIosAppId: null,
    fanPlacementId: null,
};

export const adKeys = {
    active: (type?: AdType, position?: AdPosition) =>
        ['ads', 'active', type, position] as const,
    config: ['ads', 'config'] as const,
};

/** Public — active ads for a slot. Cached 5 min, refreshed on mount. */
export function useActiveAds(type?: AdType, position?: AdPosition) {
    return useQuery({
        queryKey: adKeys.active(type, position),
        queryFn: () => AdsApi.listActive(type, position),
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
    });
}

/** Snapshot cấu hình ads — public IDs + flags. Cache 10 phút. */
export function useAdsConfig() {
    return useQuery({
        queryKey: adKeys.config,
        queryFn: () => AdsApi.getConfig().catch(() => DEFAULT_CONFIG),
        staleTime: 10 * 60_000,
        placeholderData: DEFAULT_CONFIG,
    });
}
