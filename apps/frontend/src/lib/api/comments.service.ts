import { apiClient } from './client';

export interface Comment {
  id: string;
  userId: string;
  storyId?: string;
  chapterId?: string;
  content: string;
  parentId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  story?: {
    id: string;
    title: string;
    slug: string;
  };
  chapter?: {
    id: string;
    title: string;
    slug: string;
  };
  replies?: Comment[];
  replyCount?: number;
}

export interface AdminComment extends Comment {
  story?: {
    id: string;
    title: string;
    slug: string;
  };
  chapter?: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface AdminCommentsResponse {
  data: AdminComment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCommentQuery {
  page?: number;
  limit?: number;
  search?: string;
  storyId?: string;
  userId?: string;
  isDeleted?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export const commentsService = {
  // Get comments for a story
  getStoryComments: async (
    storyId: string,
    page?: number,
    limit?: number
  ): Promise<CommentsResponse> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<CommentsResponse>(
      `/comments/stories/${storyId}?${params.toString()}`
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'comments' in (response.data as any).data) {
      return (response.data as any).data as CommentsResponse;
    }
    return (response.data as unknown as CommentsResponse);
  },

  // Get comments for a chapter
  getChapterComments: async (
    chapterId: string,
    page?: number,
    limit?: number
  ): Promise<CommentsResponse> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<CommentsResponse>(
      `/comments/chapters/${chapterId}?${params.toString()}`
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'comments' in (response.data as any).data) {
      return (response.data as any).data as CommentsResponse;
    }
    return (response.data as unknown as CommentsResponse);
  },

  // Get single comment
  getComment: async (commentId: string): Promise<Comment> => {
    const response = await apiClient.get<Comment>(`/comments/${commentId}`);
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Comment;
    }
    return (response.data as unknown as Comment);
  },

  // Create comment on story
  createStoryComment: async (
    storyId: string,
    data: CreateCommentRequest
  ): Promise<Comment> => {
    const response = await apiClient.post<Comment>(
      `/comments/stories/${storyId}`,
      data
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Comment;
    }
    return (response.data as unknown as Comment);
  },

  // Create comment on chapter
  createChapterComment: async (
    chapterId: string,
    data: CreateCommentRequest
  ): Promise<Comment> => {
    const response = await apiClient.post<Comment>(
      `/comments/chapters/${chapterId}`,
      data
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Comment;
    }
    return (response.data as unknown as Comment);
  },

  // Reply to a comment
  replyToComment: async (
    commentId: string,
    data: CreateCommentRequest
  ): Promise<Comment> => {
    const response = await apiClient.post<Comment>(
      `/comments/${commentId}/reply`,
      data
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Comment;
    }
    return (response.data as unknown as Comment);
  },

  // Update comment
  updateComment: async (
    commentId: string,
    data: UpdateCommentRequest
  ): Promise<Comment> => {
    const response = await apiClient.patch<Comment>(
      `/comments/${commentId}`,
      data
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Comment;
    }
    return (response.data as unknown as Comment);
  },

  // Delete comment
  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },

  // Get comment count for story
  getStoryCommentCount: async (storyId: string): Promise<number> => {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>(
      `/comments/stories/${storyId}/count`
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data?.count !== undefined) {
      return (response.data as any).data.count;
    }
    if ((response.data as any)?.count !== undefined) {
      return (response.data as any).count;
    }
    return 0;
  },

  // Get comment count for chapter
  getChapterCommentCount: async (chapterId: string): Promise<number> => {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>(
      `/comments/chapters/${chapterId}/count`
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data?.count !== undefined) {
      return (response.data as any).data.count;
    }
    if ((response.data as any)?.count !== undefined) {
      return (response.data as any).count;
    }
    return 0;
  },

  // Admin: Get all comments
  getAllComments: async (query: AdminCommentQuery): Promise<AdminCommentsResponse> => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.storyId) params.append('storyId', query.storyId);
    if (query.userId) params.append('userId', query.userId);
    if (query.isDeleted) params.append('isDeleted', query.isDeleted);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    const response = await apiClient.get<AdminCommentsResponse | { success: boolean; data: AdminCommentsResponse }>(
      `/comments/admin/all?${params.toString()}`
    );

    // Response structure from backend (no global ResponseInterceptor):
    // Direct: { data: [...], meta: {...} }
    // Or wrapped: { success: true, data: { data: [...], meta: {...} } }

    // Check if response is wrapped
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      // Wrapped format: { success: true, data: { data: [...], meta: {...} } }
      return (response.data as any).data as AdminCommentsResponse;
    }

    // Direct format: { data: [...], meta: {...} }
    return response.data as AdminCommentsResponse;
  },

  // Admin: Moderate comment
  moderateComment: async (commentId: string, action: 'approve' | 'delete' | 'restore'): Promise<Comment> => {
    const response = await apiClient.patch<Comment>(
      `/comments/admin/${commentId}/moderate`,
      { action }
    );
    // Handle ApiResponse wrapper
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
      return (response.data as any).data as Comment;
    }
    return (response.data as unknown as Comment);
  },
};

