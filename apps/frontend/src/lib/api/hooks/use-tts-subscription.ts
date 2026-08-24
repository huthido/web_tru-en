import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ttsService, TtsSubscriptionInfo } from '../tts.service';

export const TTS_SUBSCRIPTION_QUERY_KEY = ['tts-subscription'] as const;

/**
 * Gói tháng giọng đọc AI của tác giả đang đăng nhập.
 * `data.required && !data.active` = phải mua gói mới tự tạo audio được.
 */
export const useTtsSubscription = (enabled = true) =>
    useQuery<TtsSubscriptionInfo>({
        queryKey: TTS_SUBSCRIPTION_QUERY_KEY,
        queryFn: () => ttsService.getSubscription(),
        enabled,
        staleTime: 60 * 1000,
    });

/** Mua / gia hạn gói tháng bằng xu; xong thì làm mới ví + trạng thái gói. */
export const useSubscribeTts = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => ttsService.subscribe(),
        onSuccess: (info) => {
            queryClient.setQueryData(TTS_SUBSCRIPTION_QUERY_KEY, info);
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
        },
    });
};
