import { useQuery } from '@tanstack/react-query';
import { AdsApi, type AdPosition, type AdType } from '../api/ads.service';

export const adKeys = {
    active: (type?: AdType, position?: AdPosition) =>
        ['ads', 'active', type, position] as const,
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
