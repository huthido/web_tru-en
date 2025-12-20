import { apiClient } from './client';

export interface ReadingHistory {
  id: string;
  userId: string;
  chapterId: string;
  storyId?: string;
  progress: number; // Progress of current chapter (0-100)
  storyProgress?: number; // Progress of entire story (0-100)
  lastRead: string;
  createdAt: string;
  updatedAt: string;
  chapter?: {
    id: string;
    title: string;
    slug: string;
    order: number;
    storyId: string;
    story?: {
      id: string;
      title: string;
      slug: string;
      coverImage?: string;
      description?: string;
      authorName?: string;
      viewCount: number;
      rating: number;
      ratingCount: number;
      lastChapterAt?: string;
    };
  };
  // For backward compatibility, add story as alias to chapter.story
  story?: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string;
    description?: string;
    authorName?: string;
    viewCount: number;
    rating: number;
    ratingCount: number;
    lastChapterAt?: string;
  };
}

export interface ChapterProgress {
  progress: number;
  lastRead: string | null;
}

export const readingHistoryService = {
  saveProgress: async (chapterId: string, progress: number): Promise<ReadingHistory> => {
    const response = await apiClient.post<ReadingHistory | { success: boolean; data: ReadingHistory }>(`/chapters/${chapterId}/progress`, { progress });
    // Handle both direct response and ApiResponse wrapper
    const data = response.data as any;
    if (data && data.success !== undefined && data.data) {
      return data.data as ReadingHistory;
    }
    return data as ReadingHistory;
  },

  getHistory: async (query?: { page?: number; limit?: number }): Promise<{ data: ReadingHistory[]; meta: any }> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    const response = await apiClient.get<{ data: ReadingHistory[]; meta: any }>(`/users/me/history?${params.toString()}`);
    if ((response.data as any)?.data?.data && (response.data as any)?.data?.meta) {
      return (response.data as any).data as { data: ReadingHistory[]; meta: any };
    }
    return (response.data as unknown as { data: ReadingHistory[]; meta: any });
  },

  getChapterProgress: async (chapterId: string): Promise<ChapterProgress> => {
    const response = await apiClient.get<ChapterProgress>(`/chapters/${chapterId}/progress`);
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'progress' in (response.data as any).data) {
      return (response.data as any).data as ChapterProgress;
    }
    return (response.data as unknown as ChapterProgress);
  },

  getContinueReading: async (limit?: number): Promise<ReadingHistory[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    const response = await apiClient.get<ReadingHistory[]>(`/users/me/continue-reading?${params.toString()}`);
    if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
      return (response.data as any).data as ReadingHistory[];
    }
    return (response.data as unknown as ReadingHistory[]);
  },

  clearHistory: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>('/users/me/history');
    if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'success' in (response.data as any).data) {
      return (response.data as any).data as { success: boolean; message: string };
    }
    return (response.data as unknown as { success: boolean; message: string });
  },
};

