import { apiClient } from './client';

export interface WalletBalance {
    id: string;
    userId: string;
    balance: number;
    createdAt: string;
    updatedAt: string;
}

export interface DonateAuthorPayload {
    authorId: string;
    storyId?: string;
    amount: number;
    message?: string;
}

export interface AuthorDonationStats {
    totalCoins: number;
    donationCount: number;
    recentDonors: {
        id: string;
        amount: number;
        message: string | null;
        createdAt: string;
        user: {
            id: string;
            username: string;
            displayName: string | null;
            avatar: string | null;
        };
    }[];
}

export const WalletService = {
    getBalance: async (): Promise<WalletBalance> => {
        const response = await apiClient.get<WalletBalance>('/wallet/balance');
        return response.data.data || response.data as any;
    },

    getHistory: async () => {
        const response = await apiClient.get('/wallet/history');
        return response.data.data || response.data;
    },

    donateToAuthor: async (data: DonateAuthorPayload) => {
        const response = await apiClient.post('/wallet/donate', data);
        return response.data.data || response.data;
    },

    getAuthorDonations: async (authorId: string): Promise<AuthorDonationStats> => {
        const response = await apiClient.get<AuthorDonationStats>(`/wallet/author-donations/${authorId}`);
        return response.data.data || response.data as any;
    },
};
