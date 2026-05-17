import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WalletService, DonateAuthorPayload, RequestWithdrawalPayload, WithdrawalStatus } from '../wallet.service';

export function useWalletBalance(enabled: boolean = true) {
    return useQuery({
        queryKey: ['wallet', 'balance'],
        queryFn: () => WalletService.getBalance(),
        enabled,
        staleTime: 30 * 1000, // 30 seconds
    });
}

export function useAuthorDonations(authorId: string) {
    return useQuery({
        queryKey: ['wallet', 'author-donations', authorId],
        queryFn: () => WalletService.getAuthorDonations(authorId),
        enabled: !!authorId,
        staleTime: 60 * 1000, // 1 minute
    });
}

export function useDonateAuthor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: DonateAuthorPayload) => WalletService.donateToAuthor(data),
        onSuccess: (_data, variables) => {
            // Invalidate balance and donation stats
            queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
            queryClient.invalidateQueries({ queryKey: ['wallet', 'author-donations', variables.authorId] });
        },
    });
}

export function useMyWithdrawals() {
    return useQuery({
        queryKey: ['wallet', 'withdrawals', 'me'],
        queryFn: () => WalletService.getMyWithdrawals(),
        staleTime: 30 * 1000,
    });
}

export function useRequestWithdrawal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: RequestWithdrawalPayload) => WalletService.requestWithdrawal(data),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
                queryClient.invalidateQueries({ queryKey: ['wallet', 'withdrawals', 'me'] }),
            ]);
        },
    });
}

export function useAdminWithdrawals(status?: WithdrawalStatus) {
    return useQuery({
        queryKey: ['admin', 'withdrawals', status ?? 'ALL'],
        queryFn: () => WalletService.adminListWithdrawals(status),
        staleTime: 15 * 1000,
    });
}

export function useProcessWithdrawal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, action, note }: { id: string; action: 'APPROVE' | 'REJECT'; note?: string }) =>
            WalletService.adminProcessWithdrawal(id, action, note),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
        },
    });
}
