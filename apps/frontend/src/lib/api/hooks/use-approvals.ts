import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface ApprovalRequest {
  id: string;
  userId: string;
  storyId?: string;
  chapterId?: string;
  type: 'STORY_PUBLISH' | 'CHAPTER_PUBLISH';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  story?: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string;
  };
  chapter?: {
    id: string;
    title: string;
    slug: string;
  };
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  reviewer?: {
    id: string;
    username: string;
    displayName?: string;
  };
}

export interface ReviewApprovalRequest {
  status: 'APPROVED' | 'REJECTED';
  adminNote?: string;
}

export const approvalsService = {
  /**
   * Get all approval requests (admin only)
   */
  getAll: async (query?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }): Promise<{ data: ApprovalRequest[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.status) params.append('status', query.status);

    const response = await apiClient.get<{ data: ApprovalRequest[]; meta: any }>(
      `/approvals?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Review approval request (admin only)
   */
  review: async (id: string, data: ReviewApprovalRequest): Promise<any> => {
    const response = await apiClient.patch(`/approvals/${id}/review`, data);
    return response.data;
  },
};

/**
 * Get all approval requests (admin only)
 */
export const useApprovals = (query?: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}) => {
  return useQuery({
    queryKey: ['approvals', 'all', query],
    queryFn: () => approvalsService.getAll(query),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Review approval mutation (admin only)
 */
export const useReviewApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewApprovalRequest }) =>
      approvalsService.review(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
};

