import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { Story } from '../stories.service';

export interface HomepageSectionStory {
  id: string;
  sectionId: string;
  storyId: string;
  order: number;
  createdAt: string;
  story: Pick<Story, 'id' | 'title' | 'slug' | 'coverImage' | 'authorName' | 'viewCount' | 'rating' | 'ratingCount' | 'likeCount'>;
}

export interface HomepageSection {
  id: string;
  key: string;
  label: string;
  sortPath: string;
  algorithm: string;
  limit: number;
  seeMorePath: string | null;
  sortBy: string | null;
  mode: 'auto' | 'manual';
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  stories?: HomepageSectionStory[];
}

export interface CreateHomepageSectionData {
  key: string;
  label: string;
  sortPath?: string;
  algorithm?: string;
  limit?: number;
  seeMorePath?: string;
  sortBy?: string;
  mode?: 'auto' | 'manual';
  isActive?: boolean;
  order?: number;
}

export interface UpdateHomepageSectionData {
  label?: string;
  sortPath?: string;
  algorithm?: string;
  limit?: number;
  seeMorePath?: string;
  sortBy?: string;
  mode?: 'auto' | 'manual';
  isActive?: boolean;
  order?: number;
}

/** Lấy danh sách sections đang active (public — dùng cho homepage). */
export const useHomepageSections = () => {
  return useQuery<HomepageSection[]>({
    queryKey: ['homepage-sections'],
    queryFn: async () => {
      const response = await apiClient.get<HomepageSection[]>('/homepage-sections');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/** Lấy tất cả sections (admin — kể cả inactive). */
export const useHomepageSectionsAdmin = () => {
  return useQuery<HomepageSection[]>({
    queryKey: ['homepage-sections', 'admin'],
    queryFn: async () => {
      const response = await apiClient.get<HomepageSection[]>('/homepage-sections/admin');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 30 * 1000,
  });
};

export const useCreateHomepageSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHomepageSectionData) =>
      apiClient.post('/homepage-sections/admin', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

export const useUpdateHomepageSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHomepageSectionData }) =>
      apiClient.patch(`/homepage-sections/admin/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

export const useDeleteHomepageSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/homepage-sections/admin/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

export const useReorderHomepageSections = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      apiClient.post('/homepage-sections/admin/reorder', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

export const useSeedHomepageSections = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/homepage-sections/admin/seed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

// ─── Manual stories hooks ────────────────────────────────

export const useSearchStoriesForSection = (sectionId: string, query: string) => {
  return useQuery<any[]>({
    queryKey: ['homepage-section-stories', 'search', sectionId, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await apiClient.get<any[]>(
        `/homepage-sections/admin/${sectionId}/search-stories?q=${encodeURIComponent(query)}&limit=15`
      );
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!sectionId && query.trim().length >= 1,
    staleTime: 10 * 1000,
  });
};

export const useAddStoryToSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, storyId }: { sectionId: string; storyId: string }) =>
      apiClient.post(`/homepage-sections/admin/${sectionId}/stories`, { storyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

export const useRemoveStoryFromSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, storyId }: { sectionId: string; storyId: string }) =>
      apiClient.delete(`/homepage-sections/admin/${sectionId}/stories/${storyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};

export const useReorderSectionStories = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, items }: { sectionId: string; items: { id: string; order: number }[] }) =>
      apiClient.post(`/homepage-sections/admin/${sectionId}/reorder-stories`, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
    },
  });
};
