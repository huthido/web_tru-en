import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtPostDto } from './dto/create-art-post.dto';
import { CreateArtCommentDto } from './dto/create-art-comment.dto';

const POST_SELECT = {
  id: true,
  imageUrl: true,
  caption: true,
  width: true,
  height: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
};

@Injectable()
export class ArtService {
  constructor(private prisma: PrismaService) {}

  // ── Posts ─────────────────────────────────────────────────────────────────

  async getFeed(cursor?: string, limit = 20, currentUserId?: string) {
    const take = Math.min(limit, 50);
    const posts = await this.prisma.artPost.findMany({
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        ...POST_SELECT,
        likes: currentUserId
          ? { where: { userId: currentUserId }, select: { userId: true } }
          : false,
      },
    });

    const hasMore = posts.length > take;
    const items = hasMore ? posts.slice(0, take) : posts;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return {
      items: items.map((p) => ({
        ...p,
        likedByMe: currentUserId
          ? ((p as any).likes?.length > 0)
          : false,
        likes: undefined,
      })),
      nextCursor,
      hasMore,
    };
  }

  async createPost(userId: string, dto: CreateArtPostDto) {
    return this.prisma.artPost.create({
      data: { userId, ...dto },
      select: POST_SELECT,
    });
  }

  async deletePost(id: string, userId: string) {
    const post = await this.prisma.artPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Bài đăng không tồn tại');
    if (post.userId !== userId) throw new ForbiddenException('Không có quyền xóa');
    await this.prisma.artPost.delete({ where: { id } });
    return { success: true };
  }

  // ── Likes ─────────────────────────────────────────────────────────────────

  async toggleLike(postId: string, userId: string) {
    const existing = await this.prisma.artLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.artLike.delete({
          where: { userId_postId: { userId, postId } },
        }),
        this.prisma.artPost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    } else {
      await this.prisma.$transaction([
        this.prisma.artLike.create({ data: { userId, postId } }),
        this.prisma.artPost.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      return { liked: true };
    }
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async getComments(postId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);
    const comments = await this.prisma.artComment.findMany({
      where: { postId },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    const hasMore = comments.length > take;
    const items = hasMore ? comments.slice(0, take) : comments;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
  }

  async addComment(postId: string, userId: string, dto: CreateArtCommentDto) {
    const post = await this.prisma.artPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài đăng không tồn tại');

    const [comment] = await this.prisma.$transaction([
      this.prisma.artComment.create({
        data: { postId, userId, content: dto.content },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: { id: true, username: true, displayName: true, avatar: true },
          },
        },
      }),
      this.prisma.artPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);
    return comment;
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.artComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Bình luận không tồn tại');
    if (comment.userId !== userId) throw new ForbiddenException('Không có quyền xóa');

    await this.prisma.$transaction([
      this.prisma.artComment.delete({ where: { id } }),
      this.prisma.artPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
    return { success: true };
  }

  // ── Stories 24h ───────────────────────────────────────────────────────────

  async getActiveStories(currentUserId?: string) {
    const now = new Date();
    const stories = await this.prisma.artStory.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imageUrl: true,
        expiresAt: true,
        viewCount: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        views: currentUserId
          ? { where: { userId: currentUserId }, select: { userId: true } }
          : false,
      },
    });

    return stories.map((s) => ({
      ...s,
      seenByMe: currentUserId ? ((s as any).views?.length > 0) : false,
      views: undefined,
    }));
  }

  async createStory(userId: string, imageUrl: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.prisma.artStory.create({
      data: { userId, imageUrl, expiresAt },
      select: {
        id: true,
        imageUrl: true,
        expiresAt: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });
  }

  async viewStory(storyId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.artStoryView.upsert({
        where: { userId_storyId: { userId, storyId } },
        create: { userId, storyId },
        update: {},
      }),
      this.prisma.artStory.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
    return { success: true };
  }

  // ── Upload helper ─────────────────────────────────────────────────────────

  async getUploadSignature(userId: string) {
    // Trả về folder path để frontend upload thẳng lên Cloudinary/Garage.
    // Backend xử lý upload thực tế qua /upload/image endpoint của CloudinaryModule.
    return { folder: `art-posts/${userId}` };
  }
}
