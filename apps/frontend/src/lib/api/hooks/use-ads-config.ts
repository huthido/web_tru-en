import { useQuery } from '@tanstack/react-query';
import { adsService, type AdsConfig } from '../ads.service';

const DEFAULT_CONFIG: AdsConfig = {
    adsEnabled: false,
    consentRequired: true,
    googleAdsensePublisherId: null,
    admobAndroidAppId: null,
    admobIosAppId: null,
    fanPlacementId: null,
};

/**
 * Snapshot cấu hình ads từ backend — public IDs + flags. Cache 10 phút
 * vì hiếm khi admin đổi. Fallback to disabled-config nếu fetch fail.
 */
export function useAdsConfig() {
    return useQuery({
        queryKey: ['ads', 'config'],
        queryFn: () => adsService.getConfig().catch(() => DEFAULT_CONFIG),
        staleTime: 10 * 60 * 1000,
        placeholderData: DEFAULT_CONFIG,
    });
}
