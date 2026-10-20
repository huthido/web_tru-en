'use client';

import { memo, useState, useMemo, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { Comment } from '@/lib/api/comments.service';
import { useAuth } from '@/contexts/auth-context';
import { useReplyToComment, useUpdateComment, useDeleteComment, useToggleCommentLike } from '@/lib/api/hooks/use-comments';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { CommentForm } from './comment-form';
import { CommentContent } from './comment-content';

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

  const [now, setNow] = useState(() => new Date());
  useEffect(() => { setNow(new Date()); }, []);

  const replyMutation = useReplyToComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const likeMutation = useToggleCommentLike();
  const likeCount = comment.likeCount ?? 0;
  const liked = !!comment.likedByMe;

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
    <div id={`comment-${comment.id}`} className={`scroll-mt-24 ${depth > 0 ? 'ml-8 md:ml-12 mt-4' : 'mt-4'}`}>
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
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold">
              {(comment.user.displayName || comment.user.username)[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface-container rounded-lg p-4 shadow-sm border border-outline-variant">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface">
                  {comment.user.displayName || comment.user.username}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {formatDate(comment.createdAt)}
                </span>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-on-surface-variant">
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
                <p className="text-on-surface-variant whitespace-pre-wrap break-words">
                  <CommentContent content={comment.content} />
                </p>

                {/* Actions */}
                {!comment.isDeleted && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant">
                    {user ? (
                      <button
                        type="button"
                        onClick={() => likeMutation.mutate({ commentId: comment.id, like: !liked })}
                        aria-pressed={liked}
                        aria-label={liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
                        className={`inline-flex items-center gap-1 text-sm transition-colors ${
                          liked ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                        }`}
                      >
                        <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
                        {likeCount > 0 && <span>{likeCount}</span>}
                      </button>
                    ) : (
                      <Link
                        href="/dang-nhap"
                        aria-label="Đăng nhập để thích bình luận"
                        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        {likeCount > 0 && <span>{likeCount}</span>}
                      </Link>
                    )}
                    {canReply && (
                      <button
                        onClick={() => {
                          setIsReplying(!isReplying);
                          setShowReplies(true);
                        }}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        {isReplying ? 'Hủy' : 'Trả lời'}
                      </button>
                    )}
                    {isOwnComment && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
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
                className="text-sm text-primary hover:text-primary/80 transition-colors mb-2"
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

