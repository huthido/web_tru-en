import { apiClient, unwrap } from './client';
import type { CoinPackage, CoinTransaction, UserWallet } from './types';

export const WalletApi = {
    /** Số dư + cờ lock của user đang đăng nhập. */
    async getBalance(): Promise<UserWallet> {
        const res = await apiClient.get('/wallet/balance');
        return unwrap<UserWallet>(res);
    },

    /** 20 giao dịch gần nhất. */
    async getHistory(): Promise<CoinTransaction[]> {
        const res = await apiClient.get('/wallet/history');
        return unwrap<CoinTransaction[]>(res) ?? [];
    },

    /** Các gói xu đang bán (public — không cần auth). */
    async listCoinPackages(): Promise<CoinPackage[]> {
        const res = await apiClient.get('/payments/coin-packages');
        return unwrap<CoinPackage[]>(res) ?? [];
    },
};
