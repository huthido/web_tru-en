import { useQuery } from '@tanstack/react-query';
import { WalletApi } from '../api/wallet.service';

export const walletKeys = {
    balance: ['wallet', 'balance'] as const,
    history: ['wallet', 'history'] as const,
    packages: ['wallet', 'packages'] as const,
};

export function useWalletBalance() {
    return useQuery({
        queryKey: walletKeys.balance,
        queryFn: () => WalletApi.getBalance(),
        staleTime: 30_000,
    });
}

export function useWalletHistory() {
    return useQuery({
        queryKey: walletKeys.history,
        queryFn: () => WalletApi.getHistory(),
        staleTime: 30_000,
    });
}

/** Gói xu hiếm khi đổi — cache lâu hơn. */
export function useCoinPackages() {
    return useQuery({
        queryKey: walletKeys.packages,
        queryFn: () => WalletApi.listCoinPackages(),
        staleTime: 5 * 60_000,
    });
}
