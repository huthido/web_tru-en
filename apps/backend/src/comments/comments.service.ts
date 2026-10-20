import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { UserRole, NotificationType } from '@prisma/client';

export type CommentSort = 'newest' | 'top';

/** Tối đa số người được @nhắc tới mỗi bình luận (chống spam thông báo). */
const MAX_MENTIONS_PER_COMMENT = 5;

/**
 * Tách các `@username` trong nội dung bình luận. KHÔNG dùng regex lookbehind
 * (iOS 12 Safari — giữ cùng cú pháp với frontend): nhóm 1 bắt ký tự đứng
 * trước `@` (đầu chuỗi hoặc không phải chữ/số/_ — để "a@b.com" không bị
 * tính là nhắc tên). Dấu chấm cuối ("@abc.") bị bỏ vì thường là hết câu.
 * Trả về danh sách username (chữ thường) không trùng, theo thứ tự xuất hiện.
 */
export function extractMentions(content: string, max = MAX_MENTIONS_PER_COMMENT): string[] {
  const re = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_.]{3,32})/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content || '')) !== null) {
    const name = m[2].replace(/\.+$/, '').toLowerCase();
    if (name.length < 3 || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Transform Prisma comment to response DTO
   */
  private transformComment(comment: any, likedIds?: Set<string>): CommentResponseDto {
    return {
      id: comment.id,
      userId: comment.userId,
      storyId: comment.storyId,
      chapterId: comment.chapterId,
      content: comment.isDeleted ? '[Comment đã bị xóa]' : comment.content,
      parentId: comment.parentId,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        displayName: comment.user.displayName,
        avatar: comment.user.avatar,
      },
      replyCount: comment._count?.replies || 0,
      likeCount: comment.likeCount ?? 0,
      likedByMe: likedIds ? likedIds.has(comment.id) : false,
    };
  }

  /**
   * Build nested comment tree with depth limit (max 3 levels)
   * This prevents performance issues with deeply nested comments
   */
  private buildCommentTree(
    comments: any[],
    maxDepth: number = 3,
    likedIds?: Set<string>,
  ): CommentResponseDto[] {
    const commentMap = new Map<string, CommentResponseDto>();
    const rootComments: CommentResponseDto[] = [];

    // First pass: create all comment objects
    comments.forEach((comment) => {
      const commentDto = this.transformComment(comment, likedIds);
      commentMap.set(commentDto.id, commentDto);
    });

    // Helper to get depth of a comment
    const getDepth = (commentId: string, depth: number = 0): number => {
      if (depth > maxDepth) return maxDepth;
      const comment = comments.find(c => c.id === commentId);
      if (!comment || !comment.parentId) return depth;
      return getDepth(comment.parentId, depth + 1);
    };

    // Second pass: build tree structure with depth limit
    comments.forEach((comment) => {
      const commentDto = commentMap.get(comment.id)!;
      const depth = getDepth(comment.id);
      
      if (comment.parentId && depth < maxDepth) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(commentDto);
        }
      } else if (!comment.parentId) {
        rootComments.push(commentDto);
      }
      // If depth >= maxDepth, comment is not added to tree (prevents deep nesting)
    });

    // Sort replies by createdAt (optimized with iterative approach)
    const sortComments = (comments: CommentResponseDto[], currentDepth: number = 0) => {
      if (currentDepth > maxDepth) return;
      comments.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      comments.forEach((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          sortComments(comment.replies, currentDepth + 1);
        }
      });
    };

    // Bình luận gốc giữ nguyên thứ tự query (Mới nhất / Nổi bật — đã sort ở
    // DB); chỉ các trả lời bên trong được xếp theo thời gian tăng dần.
    rootComments.forEach((root) => {
      if (root.replies && root.replies.length > 0) sortComments(root.replies, 1);
    });
    return rootComments;
  }

  /**
   * Create a new comment
   */
  async create(
    userId: string,
    storyId: string | undefined,
    chapterId: string | undefined,
    createCommentDto: CreateCommentDto
  ): Promise<CommentResponseDto> {
    // Validate: must have either storyId or chapterId, not both
    if (!storyId && !chapterId) {
      throw new BadRequestException('Phải có storyId hoặc chapterId');
    }
    if (storyId && chapterId) {
      throw new BadRequestException('Không thể có cả storyId và chapterId');
    }

    // If parentId is provided, validate parent exists
    if (createCommentDto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Comment cha không tồn tại');
      }

      // Ensure parent is on the same story/chapter
      if (storyId && parent.storyId !== storyId) {
        throw new BadRequestException('Comment cha phải thuộc cùng story');
      }
      if (chapterId && parent.chapterId !== chapterId) {
        throw new BadRequestException('Comment cha phải thuộc cùng chapter');
      }
    }

    // Validate story/chapter exists
    if (storyId) {
      const story = await this.prisma.story.findUnique({
        where: { id: storyId },
        select: { id: true },
      });
      if (!story) {
        throw new NotFoundException('Story không tồn tại');
      }
    }

    if (chapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: chapterId },
      });
      if (!chapter) {
        throw new NotFoundException('Chapter không tồn tại');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        storyId: storyId || null,
        chapterId: chapterId || null,
        content: createCommentDto.content,
        parentId: createCommentDto.parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Notify parent comment author khi có reply (best-effort).
    if (createCommentDto.parentId) {
      this.notifyParentOnReply(createCommentDto.parentId, userId, comment.user).catch((e) =>
        this.logger.warn(`Notify reply failed: ${e?.message ?? e}`),
      );
    }

    // @nhắc tên (best-effort, không chặn response).
    if (comment.content && comment.content.indexOf('@') !== -1) {
      this.notifyMentions(comment, createCommentDto.parentId || null).catch((e) =>
        this.logger.warn(`Notify mention failed: ${e?.message ?? e}`),
      );
    }

    return this.transformComment(comment);
  }

  /**
   * Gọi sau khi tạo reply thành công. Không tự notify chính mình
   * (trường hợp user trả lời chính comment của họ).
   *
   * actionUrl ưu tiên trỏ chapter (nếu comment nằm trên chapter) để user
   * nhảy thẳng tới đúng đoạn; nếu là comment trên story, dùng hash anchor
   * scroll tới comment trên trang chi tiết truyện.
   */
  private async notifyParentOnReply(
    parentId: string,
    replierId: string,
    replier: { username: string; displayName: string | null },
  ) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: parentId },
      select: {
        userId: true,
        story: { select: { slug: true } },
        chapter: { select: { slug: true, story: { select: { slug: true } } } },
      },
    });
    if (!parent || parent.userId === replierId) return;

    let actionUrl: string | undefined;
    if (parent.chapter?.slug && parent.chapter?.story?.slug) {
      actionUrl = `/truyen/${parent.chapter.story.slug}/chuong/${parent.chapter.slug}#comment-${parentId}`;
    } else if (parent.story?.slug) {
      actionUrl = `/truyen/${parent.story.slug}#comment-${parentId}`;
    }

    const replierName = replier.displayName || replier.username;
    await this.notificationsService.notifyUser(parent.userId, {
      title: 'Có người trả lời bình luận của bạn 💬',
      content: `${replierName} đã trả lời bình luận của bạn.`,
      type: NotificationType.COMMENT_REPLY,
      actionUrl,
    });
  }

  /**
   * Gửi thông báo cho những người được `@username` trong bình luận. Bỏ qua:
   * chính người viết, và chủ bình luận cha (đã nhận thông báo "trả lời").
   * Tối đa MAX_MENTIONS_PER_COMMENT người; username khớp không phân biệt hoa thường.
   */
  private async notifyMentions(
    comment: {
      id: string;
      userId: string;
      content: string;
      storyId: string | null;
      chapterId: string | null;
      user: { username: string; displayName: string | null };
    },
    parentId: string | null,
  ) {
    const names = extractMentions(comment.content);
    if (names.length === 0) return;

    // Truyện chứa bình luận: cần độ tuổi (MATURE) để không gửi cho tài khoản trẻ.
    const story = comment.storyId
      ? await this.prisma.story.findUnique({ where: { id: comment.storyId }, select: { maturity: true } })
      : comment.chapterId
        ? (await this.prisma.chapter.findUnique({
          where: { id: comment.chapterId },
          select: { story: { select: { maturity: true } } },
        }))?.story ?? null
        : null;
    const isMature = story?.maturity === 'MATURE';

    // Khớp CHÍNH XÁC username (không dùng ILIKE: '_' / '%' là ký tự đại diện).
    const candidates = Array.from(new Set([...names, ...names.map((n) => n.toLowerCase())]));
    const users = await this.prisma.user.findMany({
      where: {
        username: { in: candidates },
        isActive: true,
        // Người đã chặn tác giả bình luận thì không nhận thông báo từ họ.
        blocks: { none: { blockedId: comment.userId } },
        // Bình luận trong truyện 18+: chỉ báo cho tài khoản được xem nội dung người lớn.
        ...(isMature ? { OR: [{ allowAdultContent: true }, { role: UserRole.ADMIN }] } : {}),
      },
      select: { id: true },
      take: MAX_MENTIONS_PER_COMMENT,
    });
    if (users.length === 0) return;

    let parentUserId: string | null = null;
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });
      parentUserId = parent?.userId ?? null;
    }

    const recipients = Array.from(new Set(users.map((u) => u.id))).filter(
      (id) => id !== comment.userId && id !== parentUserId,
    );
    if (recipients.length === 0) return;

    let actionUrl: string | undefined;
    if (comment.chapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: comment.chapterId },
        select: { slug: true, story: { select: { slug: true } } },
      });
      if (chapter?.slug && chapter.story?.slug) {
        actionUrl = `/truyen/${chapter.story.slug}/chuong/${chapter.slug}#comment-${comment.id}`;
      }
    } else if (comment.storyId) {
      const story = await this.prisma.story.findUnique({
        where: { id: comment.storyId },
        select: { slug: true },
      });
      if (story?.slug) actionUrl = `/truyen/${story.slug}#comment-${comment.id}`;
    }

    const authorName = comment.user.displayName || comment.user.username;
    const snippet =
      comment.content.length > 80 ? `${comment.content.slice(0, 80)}…` : comment.content;
    await Promise.allSettled(
      recipients.map((uid) =>
        this.notificationsService.notifyUser(uid, {
          title: 'Bạn được nhắc đến trong một bình luận 💬',
          content: `${authorName}: ${snippet}`,
          type: NotificationType.COMMENT_MENTION,
          actionUrl,
        }),
      ),
    );
  }

  /**
   * Thích bình luận (idempotent). Tạo CommentLike + tăng likeCount trong cùng
   * transaction; đã thích rồi (P2002) thì giữ nguyên.
   */
  async like(commentId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, isDeleted: true },
    });
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment không tồn tại');
    }
    try {
      await this.prisma.$transaction([
        this.prisma.commentLike.create({ data: { commentId, userId } }),
        this.prisma.comment.update({
          where: { id: commentId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e; // đã thích — idempotent
    }
    return this.likeState(commentId, true);
  }

  /** Bỏ thích (idempotent). Chỉ giảm likeCount khi thật sự xoá được 1 dòng. */
  async unlike(commentId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.commentLike.deleteMany({ where: { commentId, userId } });
      if (removed.count > 0) {
        await tx.comment.updateMany({
          where: { id: commentId, likeCount: { gt: 0 } },
          data: { likeCount: { decrement: 1 } },
        });
      }
    });
    return this.likeState(commentId, false);
  }

  private async likeState(commentId: string, liked: boolean) {
    const c = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });
    if (!c) throw new NotFoundException('Comment không tồn tại');
    return { liked, likeCount: c.likeCount };
  }

  /**
   * Find all comments for a story or chapter
   */
  async findAll(
    storyId: string | undefined,
    chapterId: string | undefined,
    page?: number,
    limit?: number,
    sort: CommentSort = 'newest',
    viewerId?: string,
  ): Promise<{ comments: CommentResponseDto[]; total: number; page: number; limit: number }> {
    if (!storyId && !chapterId) {
      throw new BadRequestException('Phải có storyId hoặc chapterId');
    }

    const where: any = {
      parentId: null, // Only get root comments
      isDeleted: false,
    };

    if (storyId) {
      where.storyId = storyId;
    }
    if (chapterId) {
      where.chapterId = chapterId;
    }

    const pageNum = page || 1;
    const limitNum = limit || 20;
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await this.prisma.comment.count({ where });

    // Get root comments with pagination
    const rootComments = await this.prisma.comment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy:
        sort === 'top'
          ? [{ likeCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Get all replies for these root comments
    const rootCommentIds = rootComments.map((c) => c.id);
    const allReplies = await this.prisma.comment.findMany({
      where: {
        parentId: { in: rootCommentIds },
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Combine and build tree
    const allComments = [...rootComments, ...allReplies];

    // Bình luận nào người xem đã thích (chỉ khi đăng nhập).
    let likedIds: Set<string> | undefined;
    if (viewerId && allComments.length > 0) {
      const likes = await this.prisma.commentLike.findMany({
        where: { userId: viewerId, commentId: { in: allComments.map((c) => c.id) } },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId));
    }

    const commentTree = this.buildCommentTree(allComments, 3, likedIds);

    return {
      comments: commentTree,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * Find one comment by ID
   */
  async findOne(commentId: string): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment không tồn tại');
    }

    return this.transformComment(comment);
  }

  /**
   * Update a comment
   */
  async update(
    commentId: string,
    userId: string,
    userRole: UserRole,
    updateCommentDto: UpdateCommentDto
  ): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment không tồn tại');
    }

    // Only owner or admin can update
    if (comment.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa comment này');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Không thể chỉnh sửa comment đã bị xóa');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: updateCommentDto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return this.transformComment(updated);
  }

  /**
   * Delete a comment (soft delete)
   */
  async delete(commentId: string, userId: string, userRole: UserRole): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment không tồn tại');
    }

    // Only owner or admin can delete
    if (comment.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xóa comment này');
    }

    // Soft delete: mark as deleted
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  /**
   * Get comment count for a story or chapter
   */
  async getCount(storyId?: string, chapterId?: string): Promise<number> {
    const where: any = {
      isDeleted: false,
    };

    if (storyId) {
      where.storyId = storyId;
    }
    if (chapterId) {
      where.chapterId = chapterId;
    }

    return this.prisma.comment.count({ where });
  }

  /**
   * Get all comments for admin (with filters)
   */
  async getAllComments(query: {
    page?: number;
    limit?: number;
    search?: string;
    storyId?: string;
    userId?: string;
    isDeleted?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by storyId
    if (query.storyId) {
      where.storyId = query.storyId;
    }

    // Filter by userId
    if (query.userId) {
      where.userId = query.userId;
    }

    // Filter by isDeleted
    if (query.isDeleted !== undefined) {
      where.isDeleted = query.isDeleted === 'true';
    }

    // Search in content
    if (query.search) {
      where.content = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await this.prisma.comment.count({ where });

    // Get comments
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const comments = await this.prisma.comment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        chapter: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return {
      data: comments.map((comment) => ({
        id: comment.id,
        userId: comment.userId,
        storyId: comment.storyId,
        chapterId: comment.chapterId,
        content: comment.isDeleted ? '[Comment đã bị xóa]' : comment.content,
        parentId: comment.parentId,
        isDeleted: comment.isDeleted,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
        story: comment.story,
        chapter: comment.chapter,
        replyCount: comment._count.replies,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Moderate a comment (admin only)
   */
  async moderateComment(commentId: string, action: 'approve' | 'delete' | 'restore'): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment không tồn tại');
    }

    let updateData: any = {};

    switch (action) {
      case 'approve':
        // Approve = restore if deleted, or do nothing if not deleted
        if (comment.isDeleted) {
          updateData.isDeleted = false;
        }
        break;
      case 'delete':
        updateData.isDeleted = true;
        break;
      case 'restore':
        updateData.isDeleted = false;
        break;
      default:
        throw new BadRequestException('Action không hợp lệ');
    }

    // If no changes needed, return current comment
    if (Object.keys(updateData).length === 0) {
      return this.findOne(commentId);
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        chapter: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return this.transformComment(updated);
  }
}

