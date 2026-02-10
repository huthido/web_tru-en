import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WalletService, DonateAuthorPayload } from '../wallet.service';

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
