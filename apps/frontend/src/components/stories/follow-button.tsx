'use client';

import { useAuth } from '@/contexts/auth-context';
import { useCheckFollowing, useFollowStory, useUnfollowStory } from '@/lib/api/hooks/use-follows';
import { useState } from 'react';
import { useToastContext } from '@/components/providers/toast-provider';

interface FollowButtonProps {
  storyId: string;
  className?: string;
  showText?: boolean;
}

import { ICON_BTN, ICON_BTN_ACTIVE, BTN_TONAL, BTN_FILLED } from '@/components/ui/action-button-styles';

export function FollowButton({ storyId, className = '', showText = true }: FollowButtonProps) {
  const { user } = useAuth();
  const { data: followingData, isLoading: isChecking } = useCheckFollowing(storyId, !!user);
  const followMutation = useFollowStory();
  const unfollowMutation = useUnfollowStory();
  const { showToast } = useToastContext();
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [optimisticState, setOptimisticState] = useState<boolean | null>(null);

  const isFollowing = optimisticState !== null ? optimisticState : followingData?.isFollowing || false;
  const isLoading = isChecking || followMutation.isPending || unfollowMutation.isPending;

  const handleToggle = async () => {
    if (!user) {
      // Redirect to login or show message
      return;
    }

    const currentState = optimisticState !== null ? optimisticState : followingData?.isFollowing || false;
    const newState = !currentState;

    // Optimistic update
    setIsOptimistic(true);
    setOptimisticState(newState);

    try {
      if (newState) {
        await followMutation.mutateAsync(storyId);
        showToast('Đã theo dõi truyện', 'success');
      } else {
        await unfollowMutation.mutateAsync(storyId);
        showToast('Đã bỏ theo dõi truyện', 'info');
      }
      // State will be updated via query invalidation
    } catch (error) {
      // Revert on error
      setOptimisticState(!newState);
      showToast('Có lỗi xảy ra. Vui lòng thử lại', 'error');
    } finally {
      setIsOptimistic(false);
    }
  };

  if (!user) {
    return (
      <button
        disabled
        className={`${showText ? BTN_TONAL : ICON_BTN} opacity-50 cursor-not-allowed ${className}`}
      >
        <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {showText && <span>Theo dõi</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`${
        isFollowing
          ? (showText ? BTN_FILLED : ICON_BTN_ACTIVE)
          : (showText ? BTN_TONAL : ICON_BTN)
      } ${className}`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin w-5 h-5 md:w-6 md:h-6 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {showText && <span>Đang xử lý...</span>}
        </>
      ) : isFollowing ? (
        <>
          <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" viewBox="0 0 24 24" fill={isFollowing ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {showText && <span>Đã theo dõi</span>}
        </>
      ) : (
        <>
          <svg className="w-5 h-5 md:w-6 md:h-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {showText && <span>Theo dõi</span>}
        </>
      )}
    </button>
  );
}

