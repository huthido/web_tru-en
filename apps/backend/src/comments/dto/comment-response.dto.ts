export interface CommentResponseDto {
  id: string;
  userId: string;
  storyId?: string;
  chapterId?: string;
  content: string;
  parentId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  replies?: CommentResponseDto[];
  replyCount?: number;
  likeCount?: number;
  /** Người xem hiện tại đã thích chưa (false khi chưa đăng nhập). */
  likedByMe?: boolean;
}

