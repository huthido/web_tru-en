import { apiClient } from './client';

export interface WalletBalance {
    id: string;
    userId: string;
    /** Bought via VNPay/Apple IAP/Google Play — spendable, NOT withdrawable. */
    purchasedBalance: number;
    /** Received from chapter/story sales, donations — withdrawable, NOT transferable. */
    earnedBalance: number;
    /** @deprecated Denormalized total = purchasedBalance + earnedBalance. */
    balance: number;
    isLocked?: boolean;
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
    topDonorsWeek?: {
        amount: number;
        user: {
            id: string;
            username: string;
            displayName: string | null;
            avatar: string | null;
        } | null;
    }[];
}

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WithdrawalRequest {
    id: string;
    userId: string;
    amount: number;
    status: WithdrawalStatus;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    note: string | null;
    processedAt: string | null;
    createdAt: string;
    user?: {
        id: string;
        username: string;
        displayName: string | null;
        email: string;
    };
}

export interface RequestWithdrawalPayload {
    amount: number;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
}

export interface AdminWalletInfo {
    user: { id: string; username: string; displayName: string | null; email: string };
    purchasedBalance: number;
    earnedBalance: number;
    /** @deprecated Denormalized total = purchasedBalance + earnedBalance. */
    balance: number;
    isLocked: boolean;
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

// Author-only: today's net revenue across donations + chapter + story sales.
export interface MyTodayEarnings {
    date: string;
    donationNet: number;
    chapterNet: number;
    storyNet: number;
    total: number;
    counts: {
        donations: number;
        chapterSales: number;
        storySales: number;
    };
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

    getMyTodayEarnings: async (): Promise<MyTodayEarnings> => {
        const response = await apiClient.get<MyTodayEarnings>('/wallet/today-earnings/me');
        return response.data.data || response.data as any;
    },

    // --- Coin transfer (spec mục 2) ---
    transferCoins: async (data: { recipient: string; amount: number; message?: string }) => {
        const response = await apiClient.post('/wallet/transfer', data);
        return response.data.data || response.data;
    },

    // --- Admin wallet lock (spec mục 2) ---
    adminGetWallet: async (identifier: string): Promise<AdminWalletInfo> => {
        const response = await apiClient.get<AdminWalletInfo>(`/admin/wallets/${encodeURIComponent(identifier)}`);
        return (response.data as any).data || (response.data as any);
    },

    adminSetWalletLock: async (identifier: string, locked: boolean): Promise<AdminWalletInfo> => {
        const response = await apiClient.patch<AdminWalletInfo>(
            `/admin/wallets/${encodeURIComponent(identifier)}/lock`,
            { locked },
        );
        return (response.data as any).data || (response.data as any);
    },

    /**
     * Admin: cộng/trừ trực tiếp một bucket (purchased hoặc earned).
     * Dùng cho support compensation, fraud cleanup, hoặc fix backfill casualties.
     * delta dương = cộng, âm = trừ. note bắt buộc (audit trail).
     */
    adminAdjustWallet: async (
        identifier: string,
        data: { bucket: 'PURCHASED' | 'EARNED'; delta: number; note: string },
    ): Promise<AdminWalletInfo> => {
        const response = await apiClient.patch<AdminWalletInfo>(
            `/admin/wallets/${encodeURIComponent(identifier)}/adjust`,
            data,
        );
        return (response.data as any).data || (response.data as any);
    },

    // --- Withdrawals (spec mục 17) ---
    requestWithdrawal: async (data: RequestWithdrawalPayload) => {
        const response = await apiClient.post('/wallet/withdrawals', data);
        return response.data.data || response.data;
    },

    getMyWithdrawals: async (): Promise<WithdrawalRequest[]> => {
        const response = await apiClient.get<WithdrawalRequest[]>('/wallet/withdrawals/me');
        return (response.data as any).data || (response.data as any);
    },

    adminListWithdrawals: async (status?: WithdrawalStatus): Promise<WithdrawalRequest[]> => {
        const response = await apiClient.get<WithdrawalRequest[]>('/admin/withdrawals', {
            params: status ? { status } : undefined,
        });
        return (response.data as any).data || (response.data as any);
    },

    adminProcessWithdrawal: async (
        id: string,
        action: 'APPROVE' | 'REJECT',
        note?: string,
    ): Promise<WithdrawalRequest> => {
        const response = await apiClient.patch<WithdrawalRequest>(`/admin/withdrawals/${id}`, {
            action,
            note,
        });
        return (response.data as any).data || (response.data as any);
    },
};
