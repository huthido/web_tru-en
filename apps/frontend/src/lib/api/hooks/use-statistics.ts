import { useQuery } from '@tanstack/react-query';
import { statisticsService, DashboardStats, StoryViewsByMonth } from '../statistics.service';

export function useAdminStatistics() {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'statistics'],
    queryFn: () => statisticsService.getStats(),
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'statistics', 'dashboard'],
    queryFn: () => statisticsService.getDashboardStats(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useUserGrowth() {
  return useQuery({
    queryKey: ['admin', 'statistics', 'user-growth'],
    queryFn: () => statisticsService.getUserGrowth(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useStoryViewsByMonth(storyId: string | null, months: number = 12) {
  return useQuery<StoryViewsByMonth>({
    queryKey: ['admin', 'statistics', 'story-views-by-month', storyId, months],
    queryFn: () => statisticsService.getStoryViewsByMonth(storyId!, months),
    enabled: !!storyId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useStoryViews() {
  return useQuery({
    queryKey: ['admin', 'statistics', 'story-views'],
    queryFn: () => statisticsService.getStoryViews(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

// Public statistics hooks
export function useStoryStats(storyId: string) {
  return useQuery({
    queryKey: ['statistics', 'story', storyId],
    queryFn: () => statisticsService.getStoryStats(storyId),
    enabled: !!storyId,
    staleTime: 300000, // 5 minutes
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['statistics', 'platform'],
    queryFn: () => statisticsService.getPlatformStats(),
    staleTime: 300000, // 5 minutes
  });
}

export function useUserActivity(userId: string) {
  return useQuery({
    queryKey: ['statistics', 'user', userId, 'activity'],
    queryFn: () => statisticsService.getUserActivity(userId),
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}

export function usePopularStories(timeframe?: 'day' | 'week' | 'month' | 'all', limit?: number) {
  return useQuery({
    queryKey: ['statistics', 'popular', timeframe, limit],
    queryFn: () => statisticsService.getPopularStories(timeframe, limit),
    staleTime: 300000, // 5 minutes
  });
}

export function useTrendingStories(limit?: number) {
  return useQuery({
    queryKey: ['statistics', 'trending', limit],
    queryFn: () => statisticsService.getTrendingStories(limit),
    staleTime: 300000, // 5 minutes
  });
}

