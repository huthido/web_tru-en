import { apiClient } from './client';

export type MissionKey = 'read' | 'listen' | 'comment';

export interface RewardsStatus {
    enabled: boolean;
    day: string;
    bonusBalance: number;
    checkIn: {
        checkedInToday: boolean;
        todayReward: number | null;
        streak: number;
        nextReward: number;
        schedule: number[];
    };
    missions: {
        key: MissionKey;
        label: string;
        target: number;
        progress: number;
        reward: number;
        claimed: boolean;
    }[];
    referral: {
        enabled: boolean;
        code: string | null;
        rewardReferrer: number;
        rewardReferee: number;
        invitedCount: number;
        rewardedCount: number;
    };
}

export interface UserPreferences {
    favoriteCategoryIds: string[];
    genreOnboarded: boolean;
}

/** client.ts đã bóc envelope {success,data} → response.data chính là payload. */
function unwrap<T>(response: { data: unknown }): T {
    return response.data as T;
}

export const rewardsService = {
    getStatus: async (): Promise<RewardsStatus> => unwrap<RewardsStatus>(await apiClient.get('/rewards/status')),
    checkIn: async (): Promise<{ streak: number; reward: number }> =>
        unwrap<{ streak: number; reward: number }>(await apiClient.post('/rewards/check-in')),
    claimMission: async (key: MissionKey): Promise<{ reward: number }> =>
        unwrap<{ reward: number }>(await apiClient.post(`/rewards/missions/${key}/claim`)),
    getReferralCode: async (): Promise<{ code: string }> =>
        unwrap<{ code: string }>(await apiClient.post('/rewards/referral/code')),
    attachReferrer: async (code: string): Promise<{ attached: boolean }> =>
        unwrap<{ attached: boolean }>(await apiClient.post('/rewards/referral/attach', { code })),
    redeemGiftCode: async (code: string): Promise<{ reward: number }> =>
        unwrap<{ reward: number }>(await apiClient.post('/rewards/gift-code/redeem', { code })),

    getPreferences: async (): Promise<UserPreferences> =>
        unwrap<UserPreferences>(await apiClient.get('/users/me/preferences')),
    setFavoriteCategories: async (categoryIds: string[]): Promise<UserPreferences> =>
        unwrap<UserPreferences>(await apiClient.patch('/users/me/favorite-categories', { categoryIds })),

    getWebPushConfig: async (): Promise<{ enabled: boolean; publicKey: string | null }> =>
        unwrap<{ enabled: boolean; publicKey: string | null }>(await apiClient.get('/notifications/web-push/config')),
    webPushSubscribe: async (sub: PushSubscriptionJSON) =>
        (await apiClient.post('/notifications/web-push/subscribe', sub)),
    webPushUnsubscribe: async (endpoint: string) =>
        (await apiClient.post('/notifications/web-push/unsubscribe', { endpoint })),
};

/** Lấy message lỗi tiếng Việt từ response backend. */
export function apiErrorMessage(e: any, fallback: string): string {
    const m = e?.response?.data?.message;
    if (Array.isArray(m)) return m[0] || fallback;
    return typeof m === 'string' && m ? m : fallback;
}
