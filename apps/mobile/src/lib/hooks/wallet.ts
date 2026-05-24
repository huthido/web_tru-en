import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { WalletApi, type TransactionHistoryParams } from '../api/wallet.service';
import type { TransactionType } from '../api/types';

export const walletKeys = {
    balance: ['wallet', 'balance'] as const,
    history: ['wallet', 'history'] as const,
    historyFiltered: (types: TransactionType[]) => ['wallet', 'history', types.join(',')] as const,
    packages: ['wallet', 'packages'] as const,
};

export function useWalletBalance() {
    return useQuery({
        queryKey: walletKeys.balance,
        queryFn: () => WalletApi.getBalance(),
        staleTime: 30_000,
    });
}

/** Widget WalletScreen — chỉ 20 GD đầu, không filter. */
export function useWalletHistory() {
    return useQuery({
        queryKey: walletKeys.history,
        queryFn: () => WalletApi.getHistory({ limit: 20 }),
        staleTime: 30_000,
    });
}

/**
 * Infinite list cho màn TransactionsScreen — load more khi cuộn cuối.
 * `types` filter giữ trong queryKey để re-query khi user chọn lại.
 */
export function useWalletHistoryInfinite(types: TransactionType[]) {
    return useInfiniteQuery({
        queryKey: walletKeys.historyFiltered(types),
        queryFn: ({ pageParam = 1 }) => {
            const params: TransactionHistoryParams = { page: pageParam, limit: 20 };
            if (types.length > 0) params.types = types;
            return WalletApi.getHistory(params);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const totalPages = Math.ceil(lastPage.total / lastPage.limit);
            return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
        },
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
