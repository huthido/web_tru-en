import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsService, Comment, CommentsResponse, CommentSort, CreateCommentRequest, UpdateCommentRequest, AdminCommentsResponse, AdminCommentQuery } from '../comments.service';
import { useToastContext } from '@/components/providers/toast-provider';

// Query keys
export const commentKeys = {
  all: ['comments'] as const,
  story: (storyId: string) => [...commentKeys.all, 'story', storyId] as const,
  chapter: (chapterId: string) => [...commentKeys.all, 'chapter', chapterId] as const,
  detail: (commentId: string) => [...commentKeys.all, 'detail', commentId] as const,
  count: {
    story: (storyId: string) => [...commentKeys.all, 'count', 'story', storyId] as const,
    chapter: (chapterId: string) => [...commentKeys.all, 'count', 'chapter', chapterId] as const,
  },
};

// Get story comments
export function useStoryComments(storyId: string, page?: number, limit?: number, sort: CommentSort = 'newest') {
  return useQuery({
    queryKey: [...commentKeys.story(storyId), page, limit, sort],
    queryFn: () => commentsService.getStoryComments(storyId, page, limit, sort),
    enabled: !!storyId,
  });
}

// Get chapter comments
export function useChapterComments(chapterId: string, page?: number, limit?: number, sort: CommentSort = 'newest') {
  return useQuery({
    queryKey: [...commentKeys.chapter(chapterId), page, limit, sort],
    queryFn: () => commentsService.getChapterComments(chapterId, page, limit, sort),
    enabled: !!chapterId,
  });
}

// Get single comment
export function useComment(commentId: string) {
  return useQuery({
    queryKey: commentKeys.detail(commentId),
    queryFn: () => commentsService.getComment(commentId),
    enabled: !!commentId,
  });
}

// Create story comment
export function useCreateStoryComment() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: CreateCommentRequest }) =>
      commentsService.createStoryComment(storyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.story(variables.storyId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.count.story(variables.storyId) });
      showToast('Đã thêm bình luận thành công', 'success');
    },
    onError: () => {
      showToast('Không thể thêm bình luận. Vui lòng thử lại.', 'error');
    },
  });
}

// Create chapter comment
export function useCreateChapterComment() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: ({ chapterId, data }: { chapterId: string; data: CreateCommentRequest }) =>
      commentsService.createChapterComment(chapterId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.chapter(variables.chapterId) });
      queryClient.invalidateQueries({ queryKey: commentKeys.count.chapter(variables.chapterId) });
      showToast('Đã thêm bình luận thành công', 'success');
    },
    onError: () => {
      showToast('Không thể thêm bình luận. Vui lòng thử lại.', 'error');
    },
  });
}

// Reply to comment
export function useReplyToComment() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: CreateCommentRequest }) =>
      commentsService.replyToComment(commentId, data),
    onSuccess: (newComment) => {
      // Invalidate based on storyId or chapterId
      if (newComment.storyId) {
        queryClient.invalidateQueries({ queryKey: commentKeys.story(newComment.storyId) });
        queryClient.invalidateQueries({ queryKey: commentKeys.count.story(newComment.storyId) });
      }
      if (newComment.chapterId) {
        queryClient.invalidateQueries({ queryKey: commentKeys.chapter(newComment.chapterId) });
        queryClient.invalidateQueries({ queryKey: commentKeys.count.chapter(newComment.chapterId) });
      }
      showToast('Đã trả lời bình luận thành công', 'success');
    },
    onError: () => {
      showToast('Không thể trả lời bình luận. Vui lòng thử lại.', 'error');
    },
  });
}

// Update comment
export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentRequest }) =>
      commentsService.updateComment(commentId, data),
    onSuccess: (updatedComment) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.detail(updatedComment.id) });
      // Invalidate story or chapter comments
      if (updatedComment.storyId) {
        queryClient.invalidateQueries({ queryKey: commentKeys.story(updatedComment.storyId) });
      }
      if (updatedComment.chapterId) {
        queryClient.invalidateQueries({ queryKey: commentKeys.chapter(updatedComment.chapterId) });
      }
      showToast('Đã cập nhật bình luận thành công', 'success');
    },
    onError: () => {
      showToast('Không thể cập nhật bình luận. Vui lòng thử lại.', 'error');
    },
  });
}

// Delete comment
export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: (commentId: string) => commentsService.deleteComment(commentId),
    onSuccess: (_, commentId) => {
      // Invalidate all comment queries
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
      showToast('Đã xóa bình luận thành công', 'success');
    },
    onError: () => {
      showToast('Không thể xóa bình luận. Vui lòng thử lại.', 'error');
    },
  });
}

/** Áp `fn` lên bình luận có id trùng, đi sâu vào các trả lời. */
function patchCommentTree(comments: Comment[], id: string, fn: (c: Comment) => Comment): Comment[] {
  let changed = false;
  const next = comments.map((c) => {
    if (c.id === id) {
      changed = true;
      return fn(c);
    }
    if (c.replies && c.replies.length > 0) {
      const replies = patchCommentTree(c.replies, id, fn);
      if (replies !== c.replies) {
        changed = true;
        return { ...c, replies };
      }
    }
    return c;
  });
  return changed ? next : comments;
}

function isCommentsResponse(data: unknown): data is CommentsResponse {
  return !!data && typeof data === 'object' && Array.isArray((data as CommentsResponse).comments);
}

/**
 * Thích / bỏ thích bình luận — cập nhật lạc quan mọi danh sách bình luận
 * trong cache (truyện + chương, mọi trang/kiểu sắp xếp), hoàn tác khi lỗi.
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  const setLike = (commentId: string, liked: boolean, likeCount?: number) => {
    queryClient.setQueriesData({ queryKey: commentKeys.all }, (old: unknown) => {
      if (!isCommentsResponse(old)) return old;
      const comments = patchCommentTree(old.comments, commentId, (c) => {
        const current = c.likeCount ?? 0;
        const wasLiked = !!c.likedByMe;
        const count =
          likeCount !== undefined
            ? likeCount
            : Math.max(0, current + (liked === wasLiked ? 0 : liked ? 1 : -1));
        return { ...c, likedByMe: liked, likeCount: count };
      });
      return comments === old.comments ? old : { ...old, comments };
    });
  };

  return useMutation({
    mutationFn: ({ commentId, like }: { commentId: string; like: boolean }) =>
      like ? commentsService.likeComment(commentId) : commentsService.unlikeComment(commentId),
    onMutate: async ({ commentId, like }) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.all });
      const snapshot = queryClient.getQueriesData({ queryKey: commentKeys.all });
      setLike(commentId, like);
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      showToast('Không thể thích bình luận. Vui lòng thử lại.', 'error');
    },
    onSuccess: (state, { commentId }) => {
      if (state && typeof state.likeCount === 'number') {
        setLike(commentId, state.liked, state.likeCount);
      }
    },
  });
}

// Get story comment count
export function useStoryCommentCount(storyId: string) {
  return useQuery({
    queryKey: commentKeys.count.story(storyId),
    queryFn: () => commentsService.getStoryCommentCount(storyId),
    enabled: !!storyId,
  });
}

// Get chapter comment count
export function useChapterCommentCount(chapterId: string) {
  return useQuery({
    queryKey: commentKeys.count.chapter(chapterId),
    queryFn: () => commentsService.getChapterCommentCount(chapterId),
    enabled: !!chapterId,
  });
}

// Admin: Get all comments
export function useAdminComments(query: AdminCommentQuery) {
  return useQuery({
    queryKey: [...commentKeys.all, 'admin', query],
    queryFn: () => commentsService.getAllComments(query),
  });
}

// Admin: Moderate comment
export function useModerateComment() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();

  return useMutation({
    mutationFn: ({ commentId, action }: { commentId: string; action: 'approve' | 'delete' | 'restore' }) =>
      commentsService.moderateComment(commentId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...commentKeys.all, 'admin'] });
      queryClient.invalidateQueries({ queryKey: commentKeys.all });
      const actionText = variables.action === 'approve' ? 'phê duyệt' : variables.action === 'delete' ? 'xóa' : 'khôi phục';
      showToast(`Đã ${actionText} bình luận thành công`, 'success');
    },
    onError: () => {
      showToast('Không thể thực hiện thao tác. Vui lòng thử lại.', 'error');
    },
  });
}

