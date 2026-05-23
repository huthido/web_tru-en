import { apiClient, unwrap } from './client';
import { normalizePage } from './types';
import type { Paged } from './types';

export type ApprovalType =
    | 'STORY_PUBLISH'
    | 'CHAPTER_PUBLISH'
    | 'STORY_UNPUBLISH'
    | 'CHAPTER_UNPUBLISH';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
    id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    storyId?: string | null;
    chapterId?: string | null;
    message?: string | null;
    reviewerNotes?: string | null;
    createdAt: string;
    updatedAt: string;
    story?: { id: string; title: string; slug: string };
    chapter?: { id: string; title: string; slug: string };
}

export const ApprovalsApi = {
    /** Tạo yêu cầu duyệt cho 1 truyện (gửi xuất bản). */
    async createStoryRequest(
        storyId: string,
        type: ApprovalType,
        message?: string,
    ): Promise<ApprovalRequest> {
        const res = await apiClient.post(`/approvals/stories/${storyId}`, { type, message });
        return unwrap<ApprovalRequest>(res);
    },

    /** Tạo yêu cầu duyệt cho 1 chương. */
    async createChapterRequest(
        chapterId: string,
        type: ApprovalType,
        message?: string,
    ): Promise<ApprovalRequest> {
        const res = await apiClient.post(`/approvals/chapters/${chapterId}`, { type, message });
        return unwrap<ApprovalRequest>(res);
    },

    /** Danh sách yêu cầu của tôi. */
    async myRequests(page = 1, limit = 50): Promise<Paged<ApprovalRequest>> {
        const res = await apiClient.get('/approvals/me', { params: { page, limit } });
        return normalizePage<ApprovalRequest>(unwrap(res));
    },
};
