import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationsApi } from '../api/notifications.service';

export const notificationKeys = {
    list: (filter: 'all' | 'unread') => ['notifications', 'list', filter] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
};

export function useNotifications(filter: 'all' | 'unread' = 'all') {
    return useInfiniteQuery({
        queryKey: notificationKeys.list(filter),
        queryFn: ({ pageParam = 1 }) =>
            NotificationsApi.getMy({
                page: pageParam,
                limit: 20,
                isRead: filter === 'unread' ? false : undefined,
            }),
        initialPageParam: 1,
        getNextPageParam: (last) => {
            const totalPages = Math.ceil(last.total / last.limit);
            return last.page < totalPages ? last.page + 1 : undefined;
        },
        staleTime: 30_000,
    });
}

export function useUnreadCount() {
    return useQuery({
        queryKey: notificationKeys.unreadCount,
        queryFn: () => NotificationsApi.getUnreadCount(),
        // Poll mỗi 60s — backend cũng có SSE stream, polling là fallback an toàn.
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
}

export function useMarkAsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (recipientId: string) => NotificationsApi.markAsRead(recipientId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllAsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => NotificationsApi.markAllAsRead(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
