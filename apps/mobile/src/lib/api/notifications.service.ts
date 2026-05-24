import { apiClient, unwrap } from './client';

export type NotificationType =
    | 'STORY_NEW_CHAPTER'
    | 'STORY_APPROVED'
    | 'STORY_REJECTED'
    | 'DONATION_RECEIVED'
    | 'CHAPTER_PURCHASED'
    | 'STORY_PURCHASED'
    | 'WITHDRAWAL_PROCESSED'
    | 'COIN_TRANSFER_RECEIVED'
    | 'COIN_DEPOSITED'
    | 'COMMENT_REPLY'
    | 'SYSTEM';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    actionUrl: string | null;
    /** Recipient row id — dùng cho markAsRead. */
    recipientId: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationsResult {
    items: Notification[];
    total: number;
    page: number;
    limit: number;
}

export interface NotificationsParams {
    page?: number;
    limit?: number;
    /** Lọc đã đọc / chưa đọc. */
    isRead?: boolean;
}

export const NotificationsApi = {
    async getMy(params: NotificationsParams = {}): Promise<NotificationsResult> {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        if (params.isRead !== undefined) qs.set('isRead', String(params.isRead));
        const url = qs.toString() ? `/notifications/my?${qs.toString()}` : '/notifications/my';
        const res = await apiClient.get(url);
        return (
            unwrap<NotificationsResult>(res) ?? { items: [], total: 0, page: 1, limit: 20 }
        );
    },

    async getUnreadCount(): Promise<{ count: number }> {
        const res = await apiClient.get('/notifications/unread-count');
        return unwrap<{ count: number }>(res) ?? { count: 0 };
    },

    async markAsRead(recipientId: string): Promise<void> {
        await apiClient.post(`/notifications/${recipientId}/read`);
    },

    async markAllAsRead(): Promise<void> {
        await apiClient.post('/notifications/mark-all-read');
    },
};
