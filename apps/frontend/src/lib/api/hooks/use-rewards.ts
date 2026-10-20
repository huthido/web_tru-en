import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rewardsService, type MissionKey } from '../rewards.service';

export function useRewardsStatus(enabled: boolean = true) {
    return useQuery({
        queryKey: ['rewards', 'status'],
        queryFn: rewardsService.getStatus,
        enabled,
        staleTime: 30 * 1000,
    });
}

/** Sau mỗi lần nhận thưởng: làm mới trạng thái + số dư ví. */
function useInvalidateRewards() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: ['rewards'] });
        qc.invalidateQueries({ queryKey: ['wallet'] });
    };
}

export function useCheckIn() {
    const invalidate = useInvalidateRewards();
    return useMutation({ mutationFn: rewardsService.checkIn, onSuccess: invalidate });
}

export function useClaimMission() {
    const invalidate = useInvalidateRewards();
    return useMutation({
        mutationFn: (key: MissionKey) => rewardsService.claimMission(key),
        onSuccess: invalidate,
    });
}

export function useReferralCode() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: rewardsService.getReferralCode,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['rewards', 'status'] }),
    });
}

export function useRedeemGiftCode() {
    const invalidate = useInvalidateRewards();
    return useMutation({
        mutationFn: (code: string) => rewardsService.redeemGiftCode(code),
        onSuccess: invalidate,
    });
}

export function useUserPreferences(enabled: boolean = true) {
    return useQuery({
        queryKey: ['users', 'me', 'preferences'],
        queryFn: rewardsService.getPreferences,
        enabled,
        staleTime: 10 * 60 * 1000,
    });
}

export function useSetFavoriteCategories() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ids: string[]) => rewardsService.setFavoriteCategories(ids),
        onSuccess: (data) => {
            qc.setQueryData(['users', 'me', 'preferences'], data);
            qc.invalidateQueries({ queryKey: ['stories', 'recommended'] });
        },
    });
}
