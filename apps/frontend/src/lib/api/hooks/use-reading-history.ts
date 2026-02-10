import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readingHistoryService, ReadingHistory, ChapterProgress } from '../reading-history.service';

export const useReadingHistory = (query?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['reading-history', 'my', query],
    queryFn: () => readingHistoryService.getHistory(query),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useContinueReading = (limit?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['reading-history', 'continue-reading', limit],
    queryFn: () => readingHistoryService.getContinueReading(limit),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useChapterProgress = (chapterId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['reading-history', 'progress', chapterId],
    queryFn: () => readingHistoryService.getChapterProgress(chapterId),
    enabled: enabled && !!chapterId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSaveProgress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, progress }: { chapterId: string; progress: number }) =>
      readingHistoryService.saveProgress(chapterId, progress),
    onSuccess: (data, variables) => {
      // Invalidate all reading history related queries
      queryClient.invalidateQueries({ queryKey: ['reading-history'] });
      // Also update the specific chapter progress cache
      queryClient.setQueryData(['reading-history', 'progress', variables.chapterId], {
        progress: variables.progress,
        lastRead: new Date().toISOString(),
      });
    },
  });
};

export const useClearHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => readingHistoryService.clearHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-history'] });
    },
  });
};

