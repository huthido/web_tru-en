import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) { }

  async getDashboardStats() {
    // Get basic counts
    const [
      totalUsers,
      totalStories,
      totalChapters,
      pendingApprovals,
      activeAds,
      totalViews,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.story.count(),
      this.prisma.chapter.count(),
      this.prisma.approvalRequest.count({
        where: { status: ApprovalStatus.PENDING },
      }),
      this.prisma.ad.count({
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            {
              AND: [
                {
                  OR: [
                    { startDate: null },
                    { startDate: { lte: new Date() } },
                  ],
                },
                {
                  OR: [
                    { endDate: null },
                    { endDate: { gte: new Date() } },
                  ],
                },
              ],
            },
          ],
        },
      }),
      this.prisma.story.aggregate({
        _sum: { viewCount: true },
      }),
    ]);

    return {
      totalUsers,
      totalStories,
      totalChapters,
      totalViews: totalViews._sum.viewCount || 0,
      pendingApprovals,
      activeAds,
    };
  }

  async getUserGrowthData(months: number = 7) {
    const data: number[] = [];
    const labels: string[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const count = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      data.push(count);
      labels.push(
        `Tháng ${startDate.getMonth() + 1}/${startDate.getFullYear()}`
      );
    }

    return { data, labels };
  }

  async getStoryViewsData(months: number = 7) {
    const data: number[] = [];
    const labels: string[] = [];
    const now = new Date();

    // Get all stories with their view counts and creation dates
    const stories = await this.prisma.story.findMany({
      select: {
        viewCount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate cumulative views up to each month
    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      // Sum views of all stories created up to this month
      // This represents cumulative views at the end of each month
      const cumulativeViews = stories
        .filter((story) => {
          const storyDate = new Date(story.createdAt);
          return storyDate <= endDate;
        })
        .reduce((sum, story) => sum + story.viewCount, 0);

      data.push(cumulativeViews);
      labels.push(
        `Tháng ${startDate.getMonth() + 1}/${startDate.getFullYear()}`
      );
    }

    return { data, labels };
  }

  async getCategoryDistribution() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            storyCategories: true,
          },
        },
      },
    });

    return {
      labels: categories.map((cat) => cat.name),
      data: categories.map((cat) => cat._count.storyCategories),
    };
  }

  async getUserRoleDistribution() {
    const users = await this.prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    return {
      labels: users.map((u) => u.role),
      data: users.map((u) => u._count.role),
    };
  }

  async getTopStories(limit: number = 5) {
    const stories = await this.prisma.story.findMany({
      take: limit,
      orderBy: {
        viewCount: 'desc',
      },
      select: {
        id: true,
        title: true,
        viewCount: true,
        authorName: true,
        createdAt: true,
      },
    });

    return stories;
  }

  /**
   * Lượt xem theo tháng của một truyện, đếm từ view_logs.
   * Lưu ý: view_logs chỉ có dữ liệu kể từ khi bật ghi log lượt xem —
   * các tháng trước thời điểm đó sẽ là 0 dù viewCount tổng vẫn lớn.
   */
  async getStoryViewsByMonth(storyId: string, months: number = 12) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, title: true, viewCount: true },
    });

    if (!story) {
      throw new Error('Story không tồn tại');
    }

    const now = new Date();
    const ranges: { start: Date; end: Date }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      ranges.push({
        start: new Date(now.getFullYear(), now.getMonth() - i, 1),
        end: new Date(now.getFullYear(), now.getMonth() - i + 1, 1),
      });
    }

    const counts = await Promise.all(
      ranges.map((range) =>
        this.prisma.viewLog.count({
          where: {
            storyId,
            createdAt: { gte: range.start, lt: range.end },
          },
        }),
      ),
    );

    return {
      story,
      labels: ranges.map(
        (range) => `Tháng ${range.start.getMonth() + 1}/${range.start.getFullYear()}`,
      ),
      data: counts,
    };
  }

  async getAllStats() {
    const [dashboardStats, userGrowth, storyViews, categoryDist, roleDist, topStories] = await Promise.all([
      this.getDashboardStats(),
      this.getUserGrowthData(7),
      this.getStoryViewsData(7),
      this.getCategoryDistribution(),
      this.getUserRoleDistribution(),
      this.getTopStories(5),
    ]);

    return {
      ...dashboardStats,
      userGrowth: userGrowth.data,
      userGrowthLabels: userGrowth.labels,
      storyViews: storyViews.data,
      storyViewsLabels: storyViews.labels,
      categoryDistribution: categoryDist,
      userRoleDistribution: roleDist,
      topStories,
    };
  }

  /**
   * Get statistics for a specific story
   */
  async getStoryStats(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        title: true,
        viewCount: true,
        likeCount: true,
        followCount: true,
        rating: true,
        ratingCount: true,
        _count: {
          select: {
            chapters: true,
            comments: true,
            favorites: true,
            follows: true,
            ratings: true,
          },
        },
      },
    });

    if (!story) {
      throw new Error('Story không tồn tại');
    }

    // Get chapter views
    const chapters = await this.prisma.chapter.findMany({
      where: { storyId },
      select: { viewCount: true },
    });
    const totalChapterViews = chapters.reduce((sum, ch) => sum + ch.viewCount, 0);

    // Get recent comments count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentComments = await this.prisma.comment.count({
      where: {
        storyId,
        createdAt: { gte: thirtyDaysAgo },
        isDeleted: false,
      },
    });

    return {
      story: {
        id: story.id,
        title: story.title,
        viewCount: story.viewCount,
        likeCount: story.likeCount,
        followCount: story.followCount,
        rating: story.rating,
        ratingCount: story.ratingCount,
      },
      counts: {
        chapters: story._count.chapters,
        comments: story._count.comments,
        favorites: story._count.favorites,
        follows: story._count.follows,
        ratings: story._count.ratings,
        recentComments,
      },
      views: {
        story: story.viewCount,
        chapters: totalChapterViews,
        total: story.viewCount + totalChapterViews,
      },
    };
  }

  /**
   * Get platform-wide statistics (public)
   */
  async getPlatformStats() {
    const [
      totalStories,
      totalChapters,
      totalUsers,
      totalComments,
      totalViews,
      averageRating,
    ] = await Promise.all([
      this.prisma.story.count({ where: { isPublished: true } }),
      this.prisma.chapter.count({ where: { isPublished: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.comment.count({ where: { isDeleted: false } }),
      this.prisma.story.aggregate({
        _sum: { viewCount: true },
        where: { isPublished: true },
      }),
      this.prisma.story.aggregate({
        _avg: { rating: true },
        where: { isPublished: true, ratingCount: { gt: 0 } },
      }),
    ]);

    return {
      totalStories,
      totalChapters,
      totalUsers,
      totalComments,
      totalViews: totalViews._sum.viewCount || 0,
      averageRating: averageRating._avg.rating || 0,
    };
  }

  /**
   * Get user activity statistics
   */
  async getUserActivity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        _count: {
          select: {
            authoredStories: true,
            comments: true,
            favorites: true,
            follows: true,
            readingHistory: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User không tồn tại');
    }

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentComments, recentStories, recentFavorites] = await Promise.all([
      this.prisma.comment.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
          isDeleted: false,
        },
      }),
      this.prisma.story.count({
        where: {
          authorId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.favorite.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      totals: {
        stories: user._count.authoredStories,
        comments: user._count.comments,
        favorites: user._count.favorites,
        follows: user._count.follows,
        readingHistory: user._count.readingHistory,
      },
      recent: {
        comments: recentComments,
        stories: recentStories,
        favorites: recentFavorites,
      },
    };
  }

  /**
   * Get popular stories based on timeframe
   */
  async getPopularStories(timeframe: 'day' | 'week' | 'month' | 'all' = 'all', limit: number = 20) {
    const now = new Date();
    let startDate: Date | undefined;

    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = undefined;
    }

    // Get stories with high engagement (views + likes + follows + ratings)
    const stories = await this.prisma.story.findMany({
      where: {
        isPublished: true,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { likeCount: 'desc' },
        { followCount: 'desc' },
        { rating: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        storyCategories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            chapters: true,
            comments: true,
          },
        },
      },
    });

    return stories.map((story) => ({
      id: story.id,
      title: story.title,
      slug: story.slug,
      description: story.description,
      coverImage: story.coverImage,
      viewCount: story.viewCount,
      likeCount: story.likeCount,
      followCount: story.followCount,
      rating: story.rating,
      ratingCount: story.ratingCount,
      author: story.author,
      categories: story.storyCategories.map((sc) => sc.category),
      chapterCount: story._count.chapters,
      commentCount: story._count.comments,
      createdAt: story.createdAt,
    }));
  }

  /**
   * Get trending stories (based on recent activity)
   */
  async getTrendingStories(limit: number = 20) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get stories with recent activity (comments, views, likes in last 7 days)
    const stories = await this.prisma.story.findMany({
      where: {
        isPublished: true,
        OR: [
          { lastChapterAt: { gte: sevenDaysAgo } },
          { updatedAt: { gte: sevenDaysAgo } },
        ],
      },
      take: limit,
      orderBy: [
        { lastChapterAt: 'desc' },
        { viewCount: 'desc' },
        { likeCount: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        storyCategories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            chapters: true,
            comments: true,
          },
        },
      },
    });

    return stories.map((story) => ({
      id: story.id,
      title: story.title,
      slug: story.slug,
      description: story.description,
      coverImage: story.coverImage,
      viewCount: story.viewCount,
      likeCount: story.likeCount,
      followCount: story.followCount,
      rating: story.rating,
      ratingCount: story.ratingCount,
      author: story.author,
      categories: story.storyCategories.map((sc) => sc.category),
      chapterCount: story._count.chapters,
      commentCount: story._count.comments,
      lastChapterAt: story.lastChapterAt,
      createdAt: story.createdAt,
    }));
  }
}

