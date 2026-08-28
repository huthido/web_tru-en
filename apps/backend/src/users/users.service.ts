import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MonetizationService } from '../monetization/monetization.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private monetization: MonetizationService,
  ) { }

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

  /* ── Apple §1.2 — block user (one-way relationship) ────────────────── */

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Không thể tự chặn chính mình');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User không tồn tại');

    // upsert để gọi nhiều lần không lỗi (idempotent từ phía mobile).
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    return { success: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return { success: true };
  }

  async listMyBlocks(userId: string) {
    return this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        profileSlug: true,
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

  // Slug bị cấm đặt — trùng route hệ thống / dễ gây nhầm.
  private static readonly RESERVED_SLUGS = new Set([
    'admin', 'api', 'me', 'u', 'app', 'auth', 'null', 'undefined', 'settings',
    'tac-gia', 'quan-tri', 'truyen', 'tranh', 'nghe-thuat', 'cua-hang', 'vi-xu',
  ]);

  /**
   * Chuẩn hoá + kiểm tra slug tuỳ chỉnh. Trả null nếu rỗng (xoá slug → dùng lại
   * username). Ném BadRequestException với thông báo rõ khi không hợp lệ / trùng.
   */
  private async normalizeProfileSlug(userId: string, raw: string): Promise<string | null> {
    const slug = (raw || '').trim().toLowerCase();
    if (!slug) return null;
    if (slug.length < 3 || slug.length > 30) {
      throw new BadRequestException('Đường dẫn chia sẻ phải từ 3 đến 30 ký tự');
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      throw new BadRequestException(
        'Đường dẫn chỉ gồm chữ thường, số và gạch ngang; không bắt đầu/kết thúc bằng gạch ngang',
      );
    }
    if (slug.includes('--')) {
      throw new BadRequestException('Đường dẫn không được có hai gạch ngang liền nhau');
    }
    if (UsersService.RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException('Đường dẫn này thuộc hệ thống, vui lòng chọn tên khác');
    }
    // Không được trùng username hoặc profileSlug của người khác (để /u/[slug]
    // không mập mờ về người).
    const clash = await this.prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ username: slug }, { profileSlug: slug }],
      },
      select: { id: true },
    });
    if (clash) {
      throw new BadRequestException('Đường dẫn này đã có người dùng, vui lòng chọn tên khác');
    }
    return slug;
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; bio?: string; avatar?: string; profileSlug?: string },
  ) {
    const updateData: {
      displayName?: string;
      bio?: string;
      avatar?: string;
      profileSlug?: string | null;
    } = {
      displayName: data.displayName,
      bio: data.bio,
      avatar: data.avatar,
    };

    // Chỉ đụng tới slug khi client thực sự gửi field (undefined = giữ nguyên).
    if (data.profileSlug !== undefined) {
      updateData.profileSlug = await this.normalizeProfileSlug(userId, data.profileSlug);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        profileSlug: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Bật / tắt quyền xem nội dung người lớn (Google Play Families Policy).
   * Quyền do phụ huynh/người giám hộ cấp cho tài khoản trẻ, hoặc tự xác nhận 18+.
   */
  async setAllowAdultContent(userId: string, allow: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { allowAdultContent: !!allow },
      select: {
        id: true,
        username: true,
        allowAdultContent: true,
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

  /** Admin: thông tin ĐẦY ĐỦ của 1 người dùng — hồ sơ + ví + thống kê. */
  async getAdminUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        profileSlug: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        emailVerified: true,
        provider: true,
        ttsSubscriptionExpiresAt: true,
        ttsVoicePreset: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: { balance: true, purchasedBalance: true, earnedBalance: true, isLocked: true },
        },
        _count: {
          select: {
            authoredStories: true,
            chapterPurchases: true,
            storyPurchases: true,
            storyItemPurchases: true,
            storyItems: true,
            favorites: true,
            follows: true,
            authorFollowers: true,
            comments: true,
            ratings: true,
            receivedDonations: true,
            sentDonations: true,
            withdrawalRequests: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    const [publishedStories, viewsAgg, chSpent, stSpent, itSpent] = await Promise.all([
      this.prisma.story.count({ where: { authorId: id, isPublished: true } }),
      this.prisma.story.aggregate({ where: { authorId: id }, _sum: { viewCount: true } }),
      this.prisma.chapterPurchase.aggregate({ where: { userId: id }, _sum: { pricePaid: true } }),
      this.prisma.storyPurchase.aggregate({ where: { userId: id }, _sum: { pricePaid: true } }),
      this.prisma.storyItemPurchase.aggregate({ where: { userId: id }, _sum: { pricePaid: true } }),
    ]);
    const totalSpent =
      (chSpent._sum.pricePaid || 0) + (stSpent._sum.pricePaid || 0) + (itSpent._sum.pricePaid || 0);

    const { _count, wallet, ...profile } = user;
    return {
      ...profile,
      wallet: wallet || { balance: 0, purchasedBalance: 0, earnedBalance: 0, isLocked: false },
      stats: {
        authoredStories: _count.authoredStories,
        publishedStories,
        totalStoryViews: viewsAgg._sum.viewCount || 0,
        authorFollowers: _count.authorFollowers,
        followingStories: _count.follows,
        favorites: _count.favorites,
        comments: _count.comments,
        ratings: _count.ratings,
        chapterPurchases: _count.chapterPurchases,
        storyPurchases: _count.storyPurchases,
        itemPurchases: _count.storyItemPurchases,
        itemsCreated: _count.storyItems,
        totalSpent,
        donationsReceived: _count.receivedDonations,
        donationsSent: _count.sentDonations,
        withdrawalRequests: _count.withdrawalRequests,
      },
    };
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
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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

    const validSortFields = ['createdAt', 'authoredStories', 'comments', 'favorites', 'follows'];
    const sortField = validSortFields.includes(options?.sortBy || '') ? options!.sortBy! : 'createdAt';
    const sortDir = options?.sortOrder === 'asc' ? 'asc' : 'desc';

    const orderBy = sortField === 'createdAt'
      ? { createdAt: sortDir as 'asc' | 'desc' }
      : { [sortField]: { _count: sortDir as 'asc' | 'desc' } };

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
        orderBy,
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

  async getPublicProfile(userId: string, callerId?: string | null) {
    return this._publicProfile({ id: userId }, callerId);
  }

  /**
   * Resolve trang cá nhân /u/[x] theo slug: khớp `username` HOẶC `profileSlug`.
   * (Khi user đặt profileSlug tuỳ chỉnh, link /u/[slug] vẫn ra đúng người; link
   * /u/[username] gốc luôn hoạt động vì username không đổi.)
   */
  async getPublicProfileByUsername(slug: string, callerId?: string | null) {
    const found = await this.prisma.user.findFirst({
      where: { OR: [{ username: slug }, { profileSlug: slug }] },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('User không tồn tại');
    }
    return this._publicProfile({ id: found.id }, callerId);
  }

  private async _publicProfile(
    where: { id: string } | { username: string },
    callerId?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where,
      select: {
        id: true,
        username: true,
        profileSlug: true,
        displayName: true,
        avatar: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            authoredStories: { where: { isPublished: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    const [viewsAgg, authorFollowerCount, isFollowing, isVerified] =
      await Promise.all([
        this.prisma.story.aggregate({
          where: { authorId: user.id, isPublished: true },
          _sum: { viewCount: true },
        }),
        this.prisma.authorFollow.count({ where: { authorId: user.id } }),
        callerId && callerId !== user.id
          ? this.prisma.authorFollow
              .findUnique({
                where: {
                  userId_authorId: { userId: callerId, authorId: user.id },
                },
                select: { id: true },
              })
              .then((r) => !!r)
          : Promise.resolve(false),
        this.monetization.isEligible(user.id).catch(() => false),
      ]);

    return {
      id: user.id,
      username: user.username,
      profileSlug: user.profileSlug,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
      publishedStoriesCount: user._count.authoredStories,
      totalViews: viewsAgg._sum.viewCount ?? 0,
      authorFollowerCount,
      isFollowing,
      // Verified ✓ = đủ điều kiện mở khoá tính năng nâng cao (xem
      // MonetizationService). Compute live, không denormalize.
      isVerified,
    };
  }

  async listPublishedStoriesByAuthor(
    authorId: string,
    page = 1,
    limit = 12,
  ) {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [stories, total] = await Promise.all([
      this.prisma.story.findMany({
        where: { authorId, isPublished: true },
        orderBy: [{ lastChapterAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: safeLimit,
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          description: true,
          status: true,
          accessType: true,
          viewCount: true,
          followCount: true,
          rating: true,
          ratingCount: true,
          updatedAt: true,
          lastChapterAt: true,
        },
      }),
      this.prisma.story.count({ where: { authorId, isPublished: true } }),
    ]);

    return {
      data: stories,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: safePage * safeLimit < total,
        hasPrev: safePage > 1,
      },
    };
  }

  /* ── Author follow (theo dõi tác giả) ──────────────────────────────── */

  async toggleAuthorFollow(followerId: string, authorId: string) {
    if (followerId === authorId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, isActive: true, deletedAt: true },
    });
    if (!author || !author.isActive || author.deletedAt) {
      throw new NotFoundException('Tác giả không tồn tại');
    }

    const existing = await this.prisma.authorFollow.findUnique({
      where: { userId_authorId: { userId: followerId, authorId } },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.authorFollow.delete({ where: { id: existing.id } });
      const count = await this.prisma.authorFollow.count({ where: { authorId } });
      return { following: false, followerCount: count };
    }

    await this.prisma.authorFollow.create({
      data: { userId: followerId, authorId },
    });
    const count = await this.prisma.authorFollow.count({ where: { authorId } });
    return { following: true, followerCount: count };
  }

  async countAuthorFollowers(authorId: string) {
    return {
      count: await this.prisma.authorFollow.count({ where: { authorId } }),
    };
  }

  async isFollowingAuthor(followerId: string, authorId: string) {
    if (followerId === authorId) return { following: false };
    const r = await this.prisma.authorFollow.findUnique({
      where: { userId_authorId: { userId: followerId, authorId } },
      select: { id: true },
    });
    return { following: !!r };
  }

  /**
   * Danh sách người theo dõi của một tác giả (để tác giả tự theo dõi lượt
   * follower). Chỉ chính chủ mới xem được danh sách của mình. Tổng số khớp
   * với `authorFollowerCount` trả về ở public profile (đếm toàn bộ bản ghi).
   */
  async listAuthorFollowers(
    authorId: string,
    requesterId: string,
    page = 1,
    limit = 20,
  ) {
    if (requesterId !== authorId) {
      throw new ForbiddenException(
        'Chỉ có thể xem danh sách người theo dõi của chính mình',
      );
    }
    const safeLimit = Math.min(50, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.prisma.authorFollow.findMany({
        where: { authorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.authorFollow.count({ where: { authorId } }),
    ]);

    const data = rows
      .filter((r) => !!r.user)
      .map((r) => ({
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName,
        avatar: r.user.avatar,
        followedAt: r.createdAt,
      }));

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: safePage * safeLimit < total,
        hasPrev: safePage > 1,
      },
    };
  }
}

