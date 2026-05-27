import { apiClient, unwrap } from './client';

export const MONETIZATION_THRESHOLDS = {
    MIN_TOTAL_VIEWS: 10_000,
    MIN_FOLLOWERS: 100,
    VIOLATION_WINDOW_DAYS: 90,
} as const;

export const AUTHOR_NOT_MONETIZED_ERROR = 'AUTHOR_NOT_MONETIZED';

export interface MonetizationEligibility {
    eligible: boolean;
    criteria: {
        totalViews: boolean;
        followers: boolean;
        accountOk: boolean;
        contentOk: boolean;
    };
    progress: {
        totalViews: { current: number; required: number };
        followers: { current: number; required: number };
    };
    reasons?: { accountOk?: string; contentOk?: string };
}

export const MonetizationService = {
    async getMyEligibility(): Promise<MonetizationEligibility> {
        const res = await apiClient.get('/author/monetization/eligibility');
        return unwrap<MonetizationEligibility>(res);
    },
};
