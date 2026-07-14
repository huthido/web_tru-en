import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adsService,
  adSlotsService,
  adBookingsService,
  Ad,
  AdType,
  AdPosition,
  AdBookingStatus,
  CreateAdRequest,
  UpdateAdRequest,
  CreateAdSlotRequest,
  CreateAdBookingRequest,
} from '../ads.service';

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

// ============================================================================
// AdSlot hooks — slot config + lookup ads của slot.
// ============================================================================

/** Admin: list tất cả slot có sẵn. */
export const useAdSlots = () => {
  return useQuery({
    queryKey: ['ad-slots', 'all'],
    queryFn: () => adSlotsService.list(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Public: lookup ds ads của 1 slot. Cache 5 phút — không cần phải fresh
 * realtime vì ad creative ít đổi. Slot disabled → trả mảng ads rỗng.
 */
export const useSlotAds = (slotKey: string, platform: 'web' | 'mobile' = 'web') => {
  return useQuery({
    queryKey: ['ad-slot', 'active', slotKey, platform],
    queryFn: () => adSlotsService.getActiveAdsByKey(slotKey, platform),
    staleTime: 5 * 60 * 1000,
    enabled: !!slotKey,
  });
};

/** Admin: tạo slot mới. */
export const useCreateAdSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdSlotRequest) => adSlotsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-slots'] });
    },
  });
};

/** Admin: cập nhật slot. */
export const useUpdateAdSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAdSlotRequest> }) =>
      adSlotsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-slots'] });
      queryClient.invalidateQueries({ queryKey: ['ad-slot'] });
    },
  });
};

// ============================================================================
// AdBooking hooks — trang /quang-cao + admin duyệt đơn.
// ============================================================================

/** Public: slot đang mở bán + lịch đã kín. */
export const useBookableSlots = () => {
  return useQuery({
    queryKey: ['ad-bookings', 'public-slots'],
    queryFn: () => adBookingsService.listPublicSlots(),
    staleTime: 60 * 1000,
  });
};

/** Khách gửi đơn đặt quảng cáo. */
export const useCreateAdBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdBookingRequest) => adBookingsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-bookings'] });
    },
  });
};

/** Đơn đặt của tôi. */
export const useMyAdBookings = (enabled = true) => {
  return useQuery({
    queryKey: ['ad-bookings', 'my'],
    queryFn: () => adBookingsService.my(),
    enabled,
  });
};

/** Khách hủy đơn PENDING. */
export const useCancelAdBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adBookingsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-bookings'] });
    },
  });
};

/** Admin: list đơn theo status. */
export const useAdminAdBookings = (status?: AdBookingStatus) => {
  return useQuery({
    queryKey: ['ad-bookings', 'admin', status ?? 'all'],
    queryFn: () => adBookingsService.listAll(status),
  });
};

/** Admin: duyệt / từ chối đơn. */
export const useReviewAdBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'APPROVED' | 'REJECTED'; adminNote?: string } }) =>
      adBookingsService.review(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['ad-slot'] });
    },
  });
};

/** Admin: xoá slot. */
export const useDeleteAdSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adSlotsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-slots'] });
    },
  });
};

