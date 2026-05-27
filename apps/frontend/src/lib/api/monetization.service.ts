import { apiClient } from './client';
import type { MonetizationEligibility } from '@shared/monetization';

export type { MonetizationEligibility } from '@shared/monetization';
export {
  MONETIZATION_THRESHOLDS,
  AUTHOR_NOT_MONETIZED_ERROR,
} from '@shared/monetization';

export const MonetizationService = {
  getMyEligibility: async (): Promise<MonetizationEligibility> => {
    const res = await apiClient.get<MonetizationEligibility>(
      '/author/monetization/eligibility',
    );
    const body: any = res.data;
    return (body?.data ?? body) as MonetizationEligibility;
  },
};
