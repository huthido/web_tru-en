'use client';

import { memo, useState, useMemo } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { Comment } from '@/lib/api/comments.service';
import { useAuth } from '@/contexts/auth-context';
import { useReplyToComment, useUpdateComment, useDeleteComment } from '@/lib/api/hooks/use-comments';
import { CommentForm } from './comment-form';

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  maxDepth?: number;
}

export const CommentItem = memo(function CommentItem({ comment, depth = 0, maxDepth = 3 }: CommentItemProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const replyMutation = useReplyToComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  const isOwnComment = useMemo(() => user?.id === comment.userId, [user?.id, comment.userId]);
  const canReply = useMemo(() => depth < maxDepth && !comment.isDeleted, [depth, maxDepth, comment.isDeleted]);
  const hasReplies = useMemo(() => comment.replies && comment.replies.length > 0, [comment.replies]);

  const handleReply = async (content: string) => {
    try {
      await replyMutation.mutateAsync({
        commentId: comment.id,
        data: { content },
      });
      setIsReplying(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdate = async (content: string) => {
    try {
      await updateMutation.mutateAsync({
        commentId: comment.id,
        data: { content },
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      try {
        await deleteMutation.mutateAsync(comment.id);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('vi-VN');
    } else if (days > 0) {
      return `${days} ngày trước`;
    } else if (hours > 0) {
      return `${hours} giờ trước`;
    } else if (minutes > 0) {
      return `${minutes} phút trước`;
    } else {
      return 'Vừa xong';
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 md:ml-12 mt-4' : 'mt-4'}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10">
          {comment.user.avatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <OptimizedImage
                src={comment.user.avatar}
                alt={comment.user.displayName || comment.user.username}
                fill
                objectFit="cover"
                sizes={ImageSizes.avatar}
                quality={80}
                placeholder="blur"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
              {(comment.user.displayName || comment.user.username)[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {comment.user.displayName || comment.user.username}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(comment.createdAt)}
                </span>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    (đã chỉnh sửa)
                  </span>
                )}
              </div>
            </div>

            {/* Comment Content */}
            {isEditing ? (
              <CommentForm
                initialContent={comment.content}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
                submitLabel="Cập nhật"
                isLoading={updateMutation.isPending}
              />
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>

                {/* Actions */}
                {!comment.isDeleted && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {canReply && (
                      <button
                        onClick={() => {
                          setIsReplying(!isReplying);
                          setShowReplies(true);
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        {isReplying ? 'Hủy' : 'Trả lời'}
                      </button>
                    )}
                    {isOwnComment && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={handleDelete}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                submitLabel="Trả lời"
                placeholder="Viết trả lời..."
                isLoading={replyMutation.isPending}
              />
            </div>
          )}

          {/* Replies */}
          {hasReplies && (
            <div className="mt-4">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-2"
              >
                {showReplies ? 'Ẩn' : 'Hiện'} {comment.replyCount || comment.replies?.length} trả lời
              </button>
              {showReplies && (
                <div>
                  {comment.replies?.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      maxDepth={maxDepth}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

