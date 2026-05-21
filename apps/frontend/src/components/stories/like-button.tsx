'use client';

import { useAuth } from '@/contexts/auth-context';
import { useCheckLiked, useLikeStory, useUnlikeStory } from '@/lib/api/hooks/use-stories';
import { useState } from 'react';
import { useToastContext } from '@/components/providers/toast-provider';

interface LikeButtonProps {
  storyId: string;
  likeCount?: number;
  className?: string;
  showCount?: boolean;
}

export function LikeButton({ storyId, likeCount: initialLikeCount, className = '', showCount = true }: LikeButtonProps) {
  const { user } = useAuth();
  const { data: likedData, isLoading: isChecking } = useCheckLiked(storyId, !!user);
  const likeMutation = useLikeStory();
  const unlikeMutation = useUnlikeStory();
  const { showToast } = useToastContext();
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const isLiked = optimisticState !== null ? optimisticState : (likedData?.isLiked ?? false);
  const likeCount = optimisticCount !== null ? optimisticCount : initialLikeCount || 0;
  const isLoading = isChecking || likeMutation.isPending || unlikeMutation.isPending;

  const handleToggle = async () => {
    if (!user) {
      return;
    }

    const currentState = optimisticState !== null ? optimisticState : (likedData?.isLiked ?? false);
    const newState = !currentState;
    const currentCount = optimisticCount !== null ? optimisticCount : initialLikeCount || 0;

    // Optimistic update
    setIsOptimistic(true);
    setOptimisticState(newState);
    setOptimisticCount(newState ? currentCount + 1 : Math.max(0, currentCount - 1));

    try {
      if (newState) {
        await likeMutation.mutateAsync(storyId);
        showToast('Đã thêm vào danh sách yêu thích', 'success');
      } else {
        await unlikeMutation.mutateAsync(storyId);
        showToast('Đã xóa khỏi danh sách yêu thích', 'info');
      }
    } catch (error) {
      // Revert on error
      setOptimisticState(!newState);
      setOptimisticCount(currentCount);
      showToast('Có lỗi xảy ra. Vui lòng thử lại', 'error');
    } finally {
      setIsOptimistic(false);
    }
  };

  if (!user) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors opacity-50 cursor-not-allowed ${className}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
        </svg>
        {showCount && <span>{likeCount}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        isLiked
          ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
          : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
      } ${className}`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </>
      ) : (
        <svg
          className={`w-full h-full ${isLiked ? 'text-red-500 dark:text-red-400' : ''}`}
          viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke={isLiked ? 'currentColor' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
        </svg>
      )}
      {showCount && <span>{likeCount}</span>}
    </button>
  );
}

