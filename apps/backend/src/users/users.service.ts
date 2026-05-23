import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * Self-delete tài khoản (Apple §5.1.1(v)). Soft delete + anonymise PII:
   * email / username đổi sang placeholder unique theo id, displayName/avatar/
   * bio/password/oauth fields nullified, isActive=false, deletedAt=now().
   * Refresh tokens và session-y data bị xoá; truyện / comment vẫn còn để giữ
   * tính toàn vẹn dữ liệu (authorId không đổi, chỉ tên hiển thị mất).
   */
  async deleteMyAccount(userId: string, password?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, deletedAt: true },
    });
    if (!user) throw new NotFoundException('User không tồn tại');
    if (user.deletedAt) {
      throw new BadRequestException('Tài khoản đã bị xoá trước đó');
    }

    // Nếu user có mật khẩu (đăng nhập local), bắt buộc xác nhận để tránh
    // device chiếm quyền thao tác xoá nhầm. OAuth-only thì JWT là đủ chứng cứ.
    if (user.password) {
      if (!password) {
        throw new BadRequestException('Vui lòng nhập mật khẩu để xác nhận');
      }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        throw new UnauthorizedException('Mật khẩu không đúng');
      }
    }

    const placeholderEmail = `deleted-${userId}@deleted.local`;
    const placeholderUsername = `deleted_${userId}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: placeholderEmail,
          username: placeholderUsername,
          displayName: null,
          avatar: null,
          bio: null,
          password: null,
          provider: null,
          providerId: null,
          isActive: false,
          deletedAt: new Date(),
        },
      });
      // Xoá refresh tokens — buộc logout mọi thiết bị.
      await (tx as any).refreshToken.deleteMany({ where: { userId } });
      // Khoá ví — không cho chi tiêu sau khi xoá; số dư earn còn lại cần
      // được admin xử lý (rút thay hoặc thu hồi tuỳ chính sách).
      try {
        await tx.userWallet.updateMany({
          where: { userId },
          data: { isLocked: true },
        });
      } catch (err) {
        this.logger.warn(`Không lock được ví khi xoá user ${userId}: ${err}`);
      }
    });

    this.logger.log(`User ${userId} self-deleted (soft delete + anonymise)`);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            authoredStories: true,
            follows: true,
            favorites: true,
            readingHistory: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            authoredStories: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return user;
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.search) {
      where.OR = [
        { username: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { displayName: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Only filter by role if explicitly provided
    // Note: We don't auto-filter by valid roles to avoid enum mismatch with database
    if (options?.role) {
      where.role = options.role as any;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              authoredStories: true,
              comments: true,
              favorites: true,
              follows: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async updateUser(id: string, data: { role?: string; isActive?: boolean; displayName?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        role: data.role as any,
        isActive: data.isActive,
        displayName: data.displayName,
        bio: data.bio,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
        isActive: true,
        bio: true,
        updatedAt: true,
      },
    });
  }

  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            authoredStories: true,
            follows: true,
            favorites: true,
            readingHistory: true,
            comments: true,
            ratings: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Get total views from authored stories
    const authoredStories = await this.prisma.story.findMany({
      where: { authorId: userId },
      select: { viewCount: true },
    });

    const totalViews = authoredStories.reduce((sum, story) => sum + story.viewCount, 0);

    return {
      storiesCount: user._count.authoredStories,
      followsCount: user._count.follows,
      favoritesCount: user._count.favorites,
      readingHistoryCount: user._count.readingHistory,
      commentsCount: user._count.comments,
      ratingsCount: user._count.ratings,
      totalViews,
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            authoredStories: true,
            follows: true,
            favorites: true,
            readingHistory: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return user;
  }
}

