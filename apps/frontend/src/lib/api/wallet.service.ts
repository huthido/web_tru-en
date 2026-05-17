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

// Author-only: real earnings breakdown including platform fee.
export interface MyDonationEarnings {
    totalGross: number;
    totalNet: number;
    totalPlatformFee: number;
    platformFeePercent: number;
    donationCount: number;
    donations: {
        id: string;
        amount: number;           // gross — what donor paid
        netAmount: number;        // what you received
        platformFee: number;      // historical fee for THIS donation
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

// Author-only: chapter-sales earnings breakdown including platform fee.
export interface MyChapterSales {
    totalGross: number;
    totalNet: number;
    totalPlatformFee: number;
    platformFeePercent: number;
    salesCount: number;
    sales: {
        id: string;
        amount: number;           // gross — what buyer paid
        netAmount: number;        // what you received
        platformFee: number;      // historical fee for THIS sale
        createdAt: string;
        user: {
            id: string;
            username: string;
            displayName: string | null;
            avatar: string | null;
        };
        chapter: {
            id: string;
            title: string;
            slug: string;
        };
    }[];
}

// Author-only: VIP story-sales earnings breakdown including platform fee.
export interface MyStorySales {
    totalGross: number;
    totalNet: number;
    totalPlatformFee: number;
    platformFeePercent: number;
    salesCount: number;
    sales: {
        id: string;
        amount: number;
        netAmount: number;
        platformFee: number;
        createdAt: string;
        user: {
            id: string;
            username: string;
            displayName: string | null;
            avatar: string | null;
        };
        story: {
            id: string;
            title: string;
            slug: string;
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

    // Author-only — full revenue breakdown including platform fee.
    getMyDonationEarnings: async (): Promise<MyDonationEarnings> => {
        const response = await apiClient.get<MyDonationEarnings>('/wallet/donations/me');
        return response.data.data || response.data as any;
    },

    // Author-only — chapter-sales revenue breakdown including platform fee.
    getMyChapterSales: async (): Promise<MyChapterSales> => {
        const response = await apiClient.get<MyChapterSales>('/wallet/chapter-sales/me');
        return response.data.data || response.data as any;
    },

    getMyStorySales: async (): Promise<MyStorySales> => {
        const response = await apiClient.get<MyStorySales>('/wallet/story-sales/me');
        return response.data.data || response.data as any;
    },
};
