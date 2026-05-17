import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationsService, CreateNotificationRequest, UpdateNotificationRequest } from '../notifications.service';

/**
 * Subscribe to the server-sent notification stream. On each push (a new
 * personal notification), refetch the bell's unread count + list so it
 * updates live without 30s polling. Cookie auth flows through the Next
 * /api proxy automatically (same-origin EventSource).
 */
export const useNotificationStream = (enabled: boolean) => {
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;
        const es = new EventSource('/api/notifications/stream');
        es.onmessage = (ev) => {
            try {
                const payload = JSON.parse(ev.data);
                if (payload?.type === 'notification') {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }
            } catch {
                /* ignore heartbeat / malformed */
            }
        };
        es.onerror = () => {
            // EventSource auto-reconnects; close on hard failure to avoid a busy loop.
            if (es.readyState === EventSource.CLOSED) es.close();
        };
        return () => es.close();
    }, [enabled, queryClient]);
};

export const useNotifications = (params?: {
    page?: number;
    limit?: number;
    type?: string;
    priority?: string;
    isActive?: boolean;
}) => {
    return useQuery({
        queryKey: ['notifications', 'admin', params],
        queryFn: () => notificationsService.getAll(params),
    });
};

export const useNotification = (id: string) => {
    return useQuery({
        queryKey: ['notifications', id],
        queryFn: () => notificationsService.getById(id),
        enabled: !!id,
    });
};

export const useCreateNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateNotificationRequest) => notificationsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useUpdateNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateNotificationRequest }) =>
            notificationsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => notificationsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

// User hooks
export const useMyNotifications = (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
}) => {
    return useQuery({
        queryKey: ['notifications', 'my', params],
        queryFn: () => notificationsService.getMyNotifications(params),
    });
};

export const useUnreadCount = () => {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationsService.getUnreadCount(),
        refetchInterval: 30000, // Refetch every 30 seconds
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (recipientId: string) => notificationsService.markAsRead(recipientId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};
