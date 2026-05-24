import { apiClient, unwrap } from './client';
import type { CoinPackage, CoinTransaction, TransactionType, UserWallet } from './types';

export interface TransactionHistoryParams {
    page?: number;
    limit?: number;
    types?: TransactionType[];
    startDate?: string; // ISO 8601
    endDate?: string;
}

export interface TransactionHistoryResult {
    items: CoinTransaction[];
    total: number;
    page: number;
    limit: number;
}

export interface EarningsBreakdown {
    /** Tiền đã trừ phí nền tảng — tác giả nhận thực. */
    net: number;
    /** Doanh thu gross trước phí. */
    gross: number;
    /** Phần phí nền tảng (gross - net). */
    platformFee: number;
    /** Tỉ lệ phí (vd 0.3 = 30%). */
    feeRate: number;
}

export interface TodayEarnings {
    donations: number;
    chapterSales: number;
    storySales: number;
    total: number;
}

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';

export interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    status: WithdrawalStatus;
    bankAccount?: string | null;
    bankName?: string | null;
    note?: string | null;
    reviewerNotes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface WithdrawalRequestInput {
    amount: number;
    bankAccount: string;
    bankName: string;
    note?: string;
}

export const WalletApi = {
    /** Số dư + cờ lock của user đang đăng nhập. */
    async getBalance(): Promise<UserWallet> {
        const res = await apiClient.get('/wallet/balance');
        return unwrap<UserWallet>(res);
    },

    /** Lịch sử giao dịch — pagination + filter type/date. */
    async getHistory(params: TransactionHistoryParams = {}): Promise<TransactionHistoryResult> {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        if (params.types && params.types.length > 0) qs.set('type', params.types.join(','));
        if (params.startDate) qs.set('startDate', params.startDate);
        if (params.endDate) qs.set('endDate', params.endDate);
        const url = qs.toString() ? `/wallet/history?${qs.toString()}` : '/wallet/history';
        const res = await apiClient.get(url);
        return (
            unwrap<TransactionHistoryResult>(res) ?? { items: [], total: 0, page: 1, limit: 20 }
        );
    },

    /** Các gói xu đang bán (public — không cần auth). */
    async listCoinPackages(): Promise<CoinPackage[]> {
        const res = await apiClient.get('/payments/coin-packages');
        return unwrap<CoinPackage[]>(res) ?? [];
    },

    // ─── Author earnings ────────────────────────────────────────────────

    async myDonations(): Promise<EarningsBreakdown> {
        const res = await apiClient.get('/wallet/donations/me');
        return unwrap<EarningsBreakdown>(res);
    },

    async myChapterSales(): Promise<EarningsBreakdown> {
        const res = await apiClient.get('/wallet/chapter-sales/me');
        return unwrap<EarningsBreakdown>(res);
    },

    async myStorySales(): Promise<EarningsBreakdown> {
        const res = await apiClient.get('/wallet/story-sales/me');
        return unwrap<EarningsBreakdown>(res);
    },

    async myTodayEarnings(): Promise<TodayEarnings> {
        const res = await apiClient.get('/wallet/today-earnings/me');
        return unwrap<TodayEarnings>(res);
    },

    // ─── Withdrawals ────────────────────────────────────────────────────

    async myWithdrawals(): Promise<Withdrawal[]> {
        const res = await apiClient.get('/wallet/withdrawals/me');
        return unwrap<Withdrawal[]>(res) ?? [];
    },

    async requestWithdrawal(input: WithdrawalRequestInput): Promise<Withdrawal> {
        const res = await apiClient.post('/wallet/withdrawals', input);
        return unwrap<Withdrawal>(res);
    },
};
