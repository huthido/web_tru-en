import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface HomepageSection {
  id: string;
  key: string;
  label: string;
  sortPath: string;
  limit: number;
  seeMorePath: string | null;
  sortBy: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomepageSectionData {
  key: string;
  label: string;
  sortPath: string;
  limit?: number;
  seeMorePath?: string;
  sortBy?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateHomepageSectionData {
  label?: string;
  sortPath?: string;
  limit?: number;
  seeMorePath?: string;
  sortBy?: string;
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
