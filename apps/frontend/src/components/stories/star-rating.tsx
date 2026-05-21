'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUserRating, useRateStory, useDeleteRating } from '@/lib/api/hooks/use-ratings';

interface StarRatingProps {
  storyId: string;
  currentRating?: number; // Story's average rating
  ratingCount?: number;
  interactive?: boolean; // If true, user can rate
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({
  storyId,
  currentRating = 0,
  ratingCount = 0,
  interactive = false,
  size = 'md',
}: StarRatingProps) {
  const { user } = useAuth();
  const { data: userRating } = useUserRating(storyId);
  const rateStory = useRateStory();
  const deleteRating = useDeleteRating();

  const [hoveredRating, setHoveredRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = interactive && hoveredRating > 0 ? hoveredRating : (userRating || currentRating);

  const handleStarClick = async (rating: number) => {
    if (!user) {
      return;
    }

    if (userRating === rating) {
      // If clicking the same rating, delete it
      await deleteRating.mutateAsync(storyId);
    } else {
      // Rate or update rating
      await rateStory.mutateAsync({
        storyId,
        data: { rating },
      });
    }
  };

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= displayRating;
    stars.push(
      <button
        key={i}
        type="button"
        onClick={() => interactive && handleStarClick(i)}
        onMouseEnter={() => interactive && setHoveredRating(i)}
        onMouseLeave={() => interactive && setHoveredRating(0)}
        disabled={!interactive || !user || rateStory.isPending || deleteRating.isPending}
        className={`
          ${interactive && user ? 'cursor-pointer transition-transform duration-200 hover:scale-125' : 'cursor-default'}
          ${sizeClasses[size]}
          ${rateStory.isPending || deleteRating.isPending ? 'opacity-50' : ''}
        `}
        title={interactive ? `Đánh giá ${i} sao` : `${i} sao`}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isFilled ? 'currentColor' : 'none'}
          className={isFilled ? 'text-yellow-500' : 'text-outline-variant'}
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">{stars}</div>
      {currentRating > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-on-surface">
            {currentRating.toFixed(1)}
          </span>
          {ratingCount > 0 && (
            <span className="text-on-surface-variant">
              ({ratingCount} {ratingCount === 1 ? 'đánh giá' : 'đánh giá'})
            </span>
          )}
        </div>
      )}
      {interactive && !user && (
        <span className="text-xs text-on-surface-variant">
          Đăng nhập để đánh giá
        </span>
      )}
    </div>
  );
}

