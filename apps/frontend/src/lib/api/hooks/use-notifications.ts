import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { notificationsService, CreateNotificationRequest, UpdateNotificationRequest } from '../notifications.service';

/**
 * Subscribe to the server-sent notification stream. On each push (a new
 * personal notification), refetch the bell's unread count + list so it
 * updates live without 30s polling. Cookie auth flows through the Next
 * /api proxy automatically (same-origin EventSource).
 *
 * Trả về `isStreamActive` — Bell có thể truyền cờ này vào `useUnreadCount`
 * để tắt polling 30s khi SSE đang chạy (giảm ~50% query bell trên user
 * online liên tục).
 */
export const useNotificationStream = (enabled: boolean) => {
    const queryClient = useQueryClient();
    const [isStreamActive, setIsStreamActive] = useState(false);
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;
        const es = new EventSource('/api/notifications/stream');
        es.onopen = () => setIsStreamActive(true);
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
            setIsStreamActive(false);
            // EventSource auto-reconnects; close on hard failure to avoid a busy loop.
            if (es.readyState === EventSource.CLOSED) es.close();
        };
        return () => {
            setIsStreamActive(false);
            es.close();
        };
    }, [enabled, queryClient]);
    return { isStreamActive };
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

/**
 * Bell badge count. Khi SSE đã alive, tắt polling 30s (SSE invalidate cache
 * ngay khi có notification mới); chỉ giữ fallback polling cho user mà SSE
 * không mở được (proxy/firewall block EventSource).
 */
export const useUnreadCount = (opts?: { sseActive?: boolean }) => {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationsService.getUnreadCount(),
        refetchInterval: opts?.sseActive ? false : 30000,
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
