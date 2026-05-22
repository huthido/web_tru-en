'use client';

import { useState } from 'react';
import { StarRating } from '@/components/stories/star-rating';

interface CommentFormProps {
  initialContent?: string;
  onSubmit: (content: string, rating?: number) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  placeholder?: string;
  isLoading?: boolean;
  showRating?: boolean;
  storyId?: string;
  currentRating?: number;
  ratingCount?: number;
}

export function CommentForm({
  initialContent = '',
  onSubmit,
  onCancel,
  submitLabel = 'Bình luận',
  placeholder = 'Viết bình luận của bạn...',
  isLoading = false,
  showRating = false,
  storyId,
  currentRating = 0,
  ratingCount = 0,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const maxLength = 5000;
  const remainingChars = maxLength - content.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > maxLength) return;
    
    await onSubmit(content.trim(), selectedRating || undefined);
    if (!initialContent) {
      setContent(''); // Clear form if it's a new comment
      setSelectedRating(null); // Reset rating
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating Section */}
      {showRating && storyId && (
        <div className="pb-4 border-b border-outline-variant">
          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            Đánh giá truyện {selectedRating ? `(${selectedRating} sao)` : '(Tùy chọn)'}
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                disabled={isLoading}
                className={`
                  transition-all duration-200
                  ${selectedRating && star <= selectedRating
                    ? 'text-yellow-500 scale-110'
                    : 'text-outline-variant hover:text-yellow-400'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-125'}
                `}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill={selectedRating && star <= selectedRating ? 'currentColor' : 'none'}
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
            ))}
            {currentRating > 0 && (
              <span className="text-sm text-on-surface-variant ml-2">
                (Đánh giá hiện tại: {currentRating.toFixed(1)} / {ratingCount} đánh giá)
              </span>
            )}
          </div>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={maxLength}
        className="w-full px-4 py-3 border border-outline-variant rounded-lg 
                   bg-surface-container text-on-surface
                   focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:border-transparent
                   resize-none transition-colors"
        disabled={isLoading}
      />
      <div className="flex items-center justify-between">
        <div className="text-sm text-on-surface-variant">
          {remainingChars < 100 && (
            <span className={remainingChars < 0 ? 'text-red-500' : ''}>
              Còn {remainingChars} ký tự
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant 
                         bg-surface-container-high rounded-lg hover:bg-surface-container-highest 
                         transition-colors"
              disabled={isLoading}
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || content.length > maxLength || isLoading}
            className="px-4 py-2 text-sm font-medium text-white 
                       bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg 
                       hover:from-pink-600 hover:to-purple-700 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all shadow-sm hover:shadow-md"
          >
            {isLoading ? 'Đang gửi...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

