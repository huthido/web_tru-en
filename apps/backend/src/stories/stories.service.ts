import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryQueryDto } from './dto/story-query.dto';
import { generateSlug, generateUniqueSlug } from '../common/utils/slug.util';
import {
  getPaginationParams,
  createPaginatedResult,
} from '../common/utils/pagination.util';
import { buildSearchConditions } from '../common/utils/search.util';
import { storyInclude, storyWithChaptersInclude } from '../prisma/prisma.helpers';
import { StoryStatus, UserRole } from '@prisma/client';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) { }

  async findAll(query: StoryQueryDto, userId?: string) {
    const { page, limit, skip } = getPaginationParams({
      page: query.page,
      limit: query.limit,
    });

    // Build where conditions
    const where: any = {};

    // Search
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Categories filter
    if (query.categories && query.categories.length > 0) {
      where.storyCategories = {
        some: {
          category: {
            slug: { in: query.categories },
          },
        },
      };
    }

    // Status filter
    if (query.status) {
      where.status = query.status as StoryStatus;
    } else {
      // Default: only show published stories for non-authors
      if (!userId) {
        where.isPublished = true;
        where.status = StoryStatus.PUBLISHED;
      }
    }

    // Country filter
    if (query.country) {
      where.country = query.country;
    }

    // Build orderBy
    let orderBy: any = {};
    switch (query.sortBy) {
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'viewCount':
        orderBy = { viewCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get total count
    const total = await this.prisma.story.count({ where });

    // Get stories
    const stories = await this.prisma.story.findMany({
      where,
      include: storyInclude,
      orderBy,
      skip,
      take: limit,
    });

    return createPaginatedResult(stories, total, page, limit);
  }

  async findOne(slug: string, userId?: string) {
    // Check if user is author or admin to include unpublished chapters
    let includeUnpublishedChapters = false;
    if (userId) {
      const storyCheck = await this.prisma.story.findUnique({
        where: { slug },
        select: { authorId: true },
      });
      if (storyCheck) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        includeUnpublishedChapters =
          storyCheck.authorId === userId ||
          Boolean(user?.role === UserRole.ADMIN);
      }
    }

    const story = await this.prisma.story.findUnique({
      where: { slug },
      include: {
        ...storyInclude,
        chapters: {
          where: includeUnpublishedChapters ? undefined : { isPublished: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            viewCount: true,
            createdAt: true,
            isPublished: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    // Check if user can view unpublished story
    if (!story.isPublished) {
      // Allow author to view their own unpublished story
      if (userId && story.authorId === userId) {
        return story;
      }

      // Allow admin to view any unpublished story
      if (userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user && user.role === UserRole.ADMIN) {
          return story;
        }
      }

      // If story is not published and user is not author/admin, deny access
      throw new ForbiddenException('Bạn không có quyền xem truyện này');
    }

    return story;
  }

  async create(userId: string, userRole: UserRole, createStoryDto: CreateStoryDto) {
    // Chỉ AUTHOR và ADMIN mới tạo được story
    if (userRole !== UserRole.AUTHOR && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Chỉ tác giả và admin mới có quyền tạo truyện');
    }
    const baseSlug = generateSlug(createStoryDto.title);

    const slugExists = async (slug: string) => {
      const existing = await this.prisma.story.findUnique({ where: { slug } });
      return !!existing;
    };

    const slug = await generateUniqueSlug(baseSlug, slugExists);

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Create story
    const story = await this.prisma.story.create({
      data: {
        title: createStoryDto.title,
        slug,
        description: createStoryDto.description,
        coverImage: createStoryDto.coverImage,
        authorId: userId,
        authorName: user.displayName || user.username,
        status: StoryStatus.DRAFT,
        isPublished: false,
        country: createStoryDto.country,
        tags: createStoryDto.tags || [],
      },
      include: storyInclude,
    });

    // Add categories
    if (createStoryDto.categoryIds && createStoryDto.categoryIds.length > 0) {
      await Promise.all(
        createStoryDto.categoryIds.map((categoryId) =>
          this.prisma.storyCategory.create({
            data: {
              storyId: story.id,
              categoryId,
            },
          })
        )
      );
    }

    // Reload with categories
    return this.findOne(slug, userId);
  }

  async update(
    id: string,
    userId: string,
    userRole: UserRole,
    updateStoryDto: UpdateStoryDto
  ) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: { storyCategories: true },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    // Check permission
    if (story.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa truyện này');
    }

    const updateData: any = {};

    if (updateStoryDto.title) {
      const baseSlug = generateSlug(updateStoryDto.title);
      const slugExists = async (slug: string) => {
        const existing = await this.prisma.story.findFirst({
          where: { slug, id: { not: id } },
        });
        return !!existing;
      };
      updateData.title = updateStoryDto.title;
      updateData.slug = await generateUniqueSlug(baseSlug, slugExists);
    }

    if (updateStoryDto.description !== undefined) {
      updateData.description = updateStoryDto.description;
    }

    if (updateStoryDto.coverImage !== undefined) {
      updateData.coverImage = updateStoryDto.coverImage;
    }

    if (updateStoryDto.status !== undefined) {
      updateData.status = updateStoryDto.status;
    }

    if (updateStoryDto.isPublished !== undefined) {
      updateData.isPublished = updateStoryDto.isPublished;
      if (updateStoryDto.isPublished && updateStoryDto.status === undefined) {
        updateData.status = StoryStatus.PUBLISHED;
      }
    }

    if (updateStoryDto.country !== undefined) {
      updateData.country = updateStoryDto.country;
    }

    if (updateStoryDto.tags !== undefined) {
      updateData.tags = updateStoryDto.tags;
    }

    // Update categories
    if (updateStoryDto.categoryIds !== undefined) {
      // Delete existing categories
      await this.prisma.storyCategory.deleteMany({
        where: { storyId: id },
      });

      // Add new categories
      if (updateStoryDto.categoryIds.length > 0) {
        await Promise.all(
          updateStoryDto.categoryIds.map((categoryId) =>
            this.prisma.storyCategory.create({
              data: {
                storyId: id,
                categoryId,
              },
            })
          )
        );
      }
    }

    const updated = await this.prisma.story.update({
      where: { id },
      data: updateData,
      include: storyInclude,
    });

    return updated;
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const story = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    // Check permission - chỉ author của story hoặc admin mới xóa được
    if (story.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xóa truyện này');
    }

    return this.prisma.story.delete({
      where: { id },
    });
  }

  async publish(id: string, userId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    if (story.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền publish truyện này');
    }

    return this.prisma.story.update({
      where: { id },
      data: {
        isPublished: true,
        status: StoryStatus.PUBLISHED,
      },
      include: storyInclude,
    });
  }

  async incrementViewCount(slug: string) {
    await this.prisma.story.update({
      where: { slug },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  async findMyStories(userId: string, query: StoryQueryDto) {
    const { page, limit, skip } = getPaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where: any = {
      authorId: userId,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status as StoryStatus;
    }

    const total = await this.prisma.story.count({ where });

    const stories = await this.prisma.story.findMany({
      where,
      include: storyInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return createPaginatedResult(stories, total, page, limit);
  }

  // Get newest stories (10-20 stories)
  async getNewest(limit: number = 15) {
    return this.prisma.story.findMany({
      where: {
        isPublished: true,
        status: StoryStatus.PUBLISHED,
      },
      include: storyInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Get best of month (highest viewCount in current month)
  async getBestOfMonth(limit: number = 15) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.prisma.story.findMany({
      where: {
        isPublished: true,
        status: StoryStatus.PUBLISHED,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: storyInclude,
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
  }

  // Get recommended stories (algorithm: weighted score based on rating, views, follows, likes)
  async getRecommended(limit: number = 15) {
    const stories = await this.prisma.story.findMany({
      where: {
        isPublished: true,
        status: StoryStatus.PUBLISHED,
      },
      include: storyInclude,
    });

    if (stories.length === 0) {
      return [];
    }

    // Calculate recommendation score
    // Score = (rating * 0.4) + (normalizedViewCount * 0.3) + (normalizedFollowCount * 0.2) + (normalizedLikeCount * 0.1)
    const maxViewCount = Math.max(...stories.map(s => s.viewCount), 1);
    const maxFollowCount = Math.max(...stories.map(s => s.followCount), 1);
    const maxLikeCount = Math.max(...stories.map(s => s.likeCount), 1);

    const scoredStories = stories.map(story => {
      const normalizedViewCount = (story.viewCount / maxViewCount) * 100;
      const normalizedFollowCount = (story.followCount / maxFollowCount) * 100;
      const normalizedLikeCount = (story.likeCount / maxLikeCount) * 100;

      // Rating is already 0-5, multiply by 20 to get 0-100 scale
      const ratingScore = story.rating * 20;

      const score =
        (ratingScore * 0.4) +
        (normalizedViewCount * 0.3) +
        (normalizedFollowCount * 0.2) +
        (normalizedLikeCount * 0.1);

      return { ...story, recommendationScore: score };
    });

    // Sort by score and return top stories
    return scoredStories
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit)
      .map(({ recommendationScore, ...story }) => story);
  }

  // Get top rated stories (based on rating and ratingCount)
  async getTopRated(limit: number = 15) {
    return this.prisma.story.findMany({
      where: {
        isPublished: true,
        status: StoryStatus.PUBLISHED,
        ratingCount: {
          gte: 5, // At least 5 ratings to be considered
        },
      },
      include: storyInclude,
      orderBy: [
        { rating: 'desc' },
        { ratingCount: 'desc' },
      ],
      take: limit,
    });
  }

  // Get most liked stories (based on likeCount and followCount)
  async getMostLiked(limit: number = 15) {
    return this.prisma.story.findMany({
      where: {
        isPublished: true,
        status: StoryStatus.PUBLISHED,
      },
      include: storyInclude,
      orderBy: [
        { likeCount: 'desc' },
        { followCount: 'desc' },
      ],
      take: limit,
    });
  }
}

