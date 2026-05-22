'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useStoryComments, useChapterComments, useCreateStoryComment, useCreateChapterComment } from '@/lib/api/hooks/use-comments';
import { CommentItem } from './comment-item';
import { CommentForm } from './comment-form';
import { Loading } from '@/components/ui/loading';
import { Story } from '@/lib/api/stories.service';
import { useRateStory } from '@/lib/api/hooks/use-ratings';
import Link from 'next/link';

interface CommentSectionProps {
  storyId?: string;
  chapterId?: string;
  story?: Story; // Story object for rating display
  page?: number;
  limit?: number;
}

export function CommentSection({ storyId, chapterId, story, page = 1, limit = 5 }: CommentSectionProps) {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(page);

  // Fetch comments
  const { data: storyComments, isLoading: storyLoading } = useStoryComments(
    storyId || '',
    currentPage,
    limit
  );
  const { data: chapterComments, isLoading: chapterLoading } = useChapterComments(
    chapterId || '',
    currentPage,
    limit
  );

  const commentsData = storyId ? storyComments : chapterComments;
  const isLoading = storyId ? storyLoading : chapterLoading;

  // Mutations
  const createStoryComment = useCreateStoryComment();
  const createChapterComment = useCreateChapterComment();
  const rateStory = useRateStory();

  const handleSubmit = async (content: string, rating?: number) => {
    try {
      // Submit comment and rating in parallel (only for stories)
      if (storyId) {
        const promises: Promise<any>[] = [
          createStoryComment.mutateAsync({
            storyId,
            data: { content },
          }),
        ];

        // If rating is provided, also submit rating
        if (rating && rating > 0) {
          promises.push(
            rateStory.mutateAsync({
              storyId,
              data: { rating },
            })
          );
        }

        await Promise.all(promises);
      } else if (chapterId) {
        await createChapterComment.mutateAsync({
          chapterId,
          data: { content },
        });
      }
    } catch (error) {
      // Error handling is done by individual mutations
      console.error('Error submitting comment/rating:', error);
    }
  };

  const comments = commentsData?.comments || [];
  const total = commentsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-on-surface">
          Bình luận {total > 0 && `(${total})`}
        </h2>
      </div>

      {/* Comment Form with Rating */}
      {user ? (
        <div className="bg-surface-container rounded-lg p-6 shadow-sm border border-outline-variant">
          <CommentForm
            onSubmit={handleSubmit}
            isLoading={createStoryComment.isPending || createChapterComment.isPending || rateStory.isPending}
            showRating={!!storyId}
            storyId={storyId}
            currentRating={story?.rating || 0}
            ratingCount={story?.ratingCount || 0}
          />
        </div>
      ) : (
        <div className="bg-surface-container rounded-lg p-6 shadow-sm border border-outline-variant text-center">
          <p className="text-on-surface-variant mb-4">
            Vui lòng đăng nhập để bình luận
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 
                     text-white rounded-lg hover:from-pink-600 hover:to-purple-700 
                     transition-all shadow-sm hover:shadow-md"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <Loading />
      ) : comments.length === 0 ? (
        <div className="bg-surface-container rounded-lg p-8 shadow-sm border border-outline-variant text-center">
          <p className="text-on-surface-variant">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant 
                           bg-surface-container border border-outline-variant 
                           rounded-lg hover:bg-surface-container-high 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              <span className="px-4 py-2 text-sm text-on-surface-variant">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant 
                           bg-surface-container border border-outline-variant 
                           rounded-lg hover:bg-surface-container-high 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

