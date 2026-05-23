import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adsService, Ad, AdType, AdPosition, CreateAdRequest, UpdateAdRequest } from '../ads.service';

/**
 * Get active ads for display (public)
 */
export const useActiveAds = (type?: AdType, position?: AdPosition) => {
  return useQuery({
    queryKey: ['ads', 'active', type, position],
    queryFn: async () => {
      const result = await adsService.getActiveAds(type, position);
      // Ensure we return an array
      if (Array.isArray(result)) {
        return result;
      }
      // Handle ApiResponse format
      if (result && (result as any).data && Array.isArray((result as any).data)) {
        return (result as any).data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Get all ads (admin only)
 */
export const useAds = (query?: {
  type?: AdType;
  position?: AdPosition;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['ads', 'all', query],
    queryFn: () => adsService.getAll(query),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get single ad by ID (admin only)
 */
export const useAd = (id: string) => {
  return useQuery({
    queryKey: ['ad', id],
    queryFn: () => adsService.getById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Create ad mutation (admin only)
 */
export const useCreateAd = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdRequest) => adsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });
};

/**
 * Update ad mutation (admin only)
 */
export const useUpdateAd = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdRequest }) =>
      adsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['ad', variables.id] });
    },
  });
};

/**
 * Delete ad mutation (admin only)
 */
export const useDeleteAd = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });
};

/**
 * Get analytics for one ad (admin only).
 */
export const useAdAnalytics = (
  id: string,
  dateRange?: { from: string; to: string },
) => {
  return useQuery({
    queryKey: ['ad', id, 'analytics', dateRange],
    queryFn: () => adsService.getAnalytics(id, dateRange),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

/**
 * Track ad view mutation (public)
 */
export const useTrackAdView = () => {
  return useMutation({
    mutationFn: (id: string) => adsService.trackView(id),
  });
};

/**
 * Track ad click mutation (public)
 */
export const useTrackAdClick = () => {
  return useMutation({
    mutationFn: (id: string) => adsService.trackClick(id),
  });
};

