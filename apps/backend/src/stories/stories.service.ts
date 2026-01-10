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
import { storyInclude, storyWithChaptersInclude, safeStorySelect } from '../prisma/prisma.helpers';
import { StoryStatus, UserRole } from '@prisma/client';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) { }

  // Rate limiting check for all users
  private async checkRateLimits(userId: string, userRole: UserRole) {
    // Check draft limit
    const draftCount = await this.prisma.story.count({
      where: {
        authorId: userId,
        isPublished: false,
        status: StoryStatus.DRAFT,
      },
    });

    // Draft limits based on role
    const draftLimit = userRole === UserRole.ADMIN ? 999 : (userRole === UserRole.AUTHOR ? 50 : 3);

    if (draftCount >= draftLimit) {
      throw new BadRequestException(`Bạn đã đạt giới hạn ${draftLimit} truyện nháp. Vui lòng hoàn thành hoặc xóa truyện cũ.`);
    }

    // Check daily limit (for all roles)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayStories = await this.prisma.story.count({
      where: {
        authorId: userId,
        createdAt: {
          gte: todayStart,
        },
      },
    });

    const dailyLimit = userRole === UserRole.ADMIN ? 999 : (userRole === UserRole.AUTHOR ? 20 : 5);

    if (todayStories >= dailyLimit) {
      throw new BadRequestException(`Bạn chỉ có thể tạo tối đa ${dailyLimit} truyện mỗi ngày.`);
    }
  }

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
    try {
      const stories = await this.prisma.story.findMany({
        where,
        include: storyInclude,
        orderBy,
        skip,
        take: limit,
      });

      return createPaginatedResult(stories, total, page, limit);
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        const stories = await this.prisma.story.findMany({
          where,
          select: safeStorySelect,
          orderBy,
          skip,
          take: limit,
        });

        return createPaginatedResult(stories, total, page, limit);
      }
      throw error;
    }
  }

  async findOne(slugOrId: string, userId?: string) {
    // Check if user is author or admin to include unpublished chapters
    let includeUnpublishedChapters = false;
    // Try to find by ID first, then by slug
    // Prisma IDs can be 25-26 characters (cuid), alphanumeric
    let storyCheck = null;
    let whereClause: { id: string } | { slug: string } | null = null;

    // Try ID first if it looks like an ID (20-26 chars, alphanumeric, starts with letter)
    // Prisma cuid IDs are typically 25-26 chars and start with 'c'
    const looksLikeId = (slugOrId.length >= 20 && slugOrId.length <= 26) &&
      /^[a-z][a-z0-9]{19,25}$/i.test(slugOrId);

    if (looksLikeId) {
      storyCheck = await this.prisma.story.findUnique({
        where: { id: slugOrId },
        select: { id: true, authorId: true, isPublished: true },
      });
      if (storyCheck) {
        whereClause = { id: slugOrId };
      }
    }

    // If not found by ID, try by slug
    if (!storyCheck) {
      storyCheck = await this.prisma.story.findUnique({
        where: { slug: slugOrId },
        select: { id: true, authorId: true, isPublished: true },
      });
      if (storyCheck) {
        whereClause = { slug: slugOrId };
      }
    }

    if (!storyCheck || !whereClause) {
      // Log for debugging
      console.log(`Story not found: ${slugOrId}, looksLikeId: ${looksLikeId}, length: ${slugOrId.length}`);
      throw new NotFoundException(`Truyện không tồn tại với ID/slug: ${slugOrId}`);
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      includeUnpublishedChapters =
        storyCheck.authorId === userId ||
        Boolean(user?.role === UserRole.ADMIN);
    }

    try {
      const story = await this.prisma.story.findUnique({
        where: whereClause as { id: string } | { slug: string },
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
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        const story = await this.prisma.story.findUnique({
          where: whereClause as { id: string } | { slug: string },
          select: {
            ...safeStorySelect,
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
      throw error;
    }
  }

  async create(userId: string, userRole: UserRole, createStoryDto: CreateStoryDto) {
    // Tất cả user đều có thể tạo truyện (USER, AUTHOR, ADMIN)
    // Nhưng chỉ ADMIN mới có thể tự publish mà không cần approval

    // Rate limiting cho tất cả roles
    await this.checkRateLimits(userId, userRole);
    const baseSlug = generateSlug(createStoryDto.title);

    const slugExists = async (slug: string) => {
      const existing = await this.prisma.story.findUnique({
        where: { slug },
        select: { id: true }, // Only select id to avoid isRecommended column issue
      });
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
    let story;
    try {
      story = await this.prisma.story.create({
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
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        story = await this.prisma.story.create({
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
          select: safeStorySelect,
        });
      } else {
        throw error;
      }
    }

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
    // Use select instead of include to avoid isRecommended column issue
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        title: true,
        slug: true,
        storyCategories: {
          select: {
            categoryId: true,
          },
        },
      },
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
          select: { id: true }, // Only select id to avoid isRecommended column issue
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

    // Handle isRecommended separately using raw SQL if column exists
    let isRecommendedValue: boolean | undefined = undefined;
    if (updateStoryDto.isRecommended !== undefined && userRole === UserRole.ADMIN) {
      isRecommendedValue = updateStoryDto.isRecommended;
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

    // Update story fields (excluding isRecommended for now)
    try {
      const updated = await this.prisma.story.update({
        where: { id },
        data: updateData,
        include: storyInclude,
      });

      // If isRecommended needs to be updated, try using raw SQL
      if (isRecommendedValue !== undefined) {
        try {
          // First try to update using Prisma (if column exists in schema)
          await this.prisma.$executeRawUnsafe(
            `UPDATE "stories" SET "isRecommended" = $1 WHERE "id" = $2`,
            isRecommendedValue,
            id
          );
          // Refetch to get updated isRecommended value
          const updatedWithRecommended = await this.prisma.story.findUnique({
            where: { id },
            include: storyInclude,
          });
          return updatedWithRecommended || updated;
        } catch (rawError: any) {
          // Column doesn't exist, try to add it first
          if (rawError?.message?.includes('isRecommended') || rawError?.code === '42703') {
            try {
              // Try to add column if it doesn't exist
              await this.prisma.$executeRawUnsafe(
                `ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false`
              );
              // Retry update
              await this.prisma.$executeRawUnsafe(
                `UPDATE "stories" SET "isRecommended" = $1 WHERE "id" = $2`,
                isRecommendedValue,
                id
              );
              // Refetch
              const updatedWithRecommended = await this.prisma.story.findUnique({
                where: { id },
                include: storyInclude,
              });
              return updatedWithRecommended || updated;
            } catch (addColumnError: any) {
              console.error('Failed to add isRecommended column:', addColumnError);
              throw new Error('Không thể cập nhật trạng thái đề xuất. Vui lòng chạy migration để thêm column isRecommended vào database.');
            }
          }
          throw rawError;
        }
      }

      return updated;
    } catch (error: any) {
      // If error is about isRecommended in updateData, remove it and retry
      if (error?.message?.includes('isRecommended')) {
        const { isRecommended, ...safeUpdateData } = updateData;

        if (Object.keys(safeUpdateData).length === 0 && isRecommendedValue === undefined) {
          return this.findOne(id, userId);
        }

        try {
          const updated = await this.prisma.story.update({
            where: { id },
            data: safeUpdateData,
            include: storyInclude,
          });

          // Try to update isRecommended using raw SQL if needed
          if (isRecommendedValue !== undefined) {
            try {
              // First try to update using Prisma (if column exists in schema)
              await this.prisma.$executeRawUnsafe(
                `UPDATE "stories" SET "isRecommended" = $1 WHERE "id" = $2`,
                isRecommendedValue,
                id
              );
              const updatedWithRecommended = await this.prisma.story.findUnique({
                where: { id },
                include: storyInclude,
              });
              return updatedWithRecommended || updated;
            } catch (rawError: any) {
              // Column doesn't exist, try to add it first
              if (rawError?.message?.includes('isRecommended') || rawError?.code === '42703') {
                try {
                  // Try to add column if it doesn't exist
                  await this.prisma.$executeRawUnsafe(
                    `ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false`
                  );
                  // Retry update
                  await this.prisma.$executeRawUnsafe(
                    `UPDATE "stories" SET "isRecommended" = $1 WHERE "id" = $2`,
                    isRecommendedValue,
                    id
                  );
                  // Refetch
                  const updatedWithRecommended = await this.prisma.story.findUnique({
                    where: { id },
                    include: storyInclude,
                  });
                  return updatedWithRecommended || updated;
                } catch (addColumnError: any) {
                  console.error('Failed to add isRecommended column:', addColumnError);
                  throw new Error('Không thể cập nhật trạng thái đề xuất. Vui lòng chạy migration để thêm column isRecommended vào database.');
                }
              }
              throw rawError;
            }
          }

          return updated;
        } catch (retryError: any) {
          if (retryError?.message?.includes('isRecommended')) {
            const updated = await this.prisma.story.update({
              where: { id },
              data: safeUpdateData,
              select: safeStorySelect,
            });
            return updated;
          }
          throw retryError;
        }
      }
      throw error;
    }
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: { id: true, authorId: true },
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

  async publish(id: string, userId: string, userRole: UserRole) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        isPublished: true,
        status: true,
        chapters: {
          select: { id: true },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    if (story.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền publish truyện này');
    }

    // Chỉ ADMIN mới có thể tự publish
    // USER và AUTHOR phải gửi approval request
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn cần gửi yêu cầu phê duyệt để xuất bản truyện. Chỉ Admin mới có thể tự xuất bản.');
    }

    // Check if story has at least 1 chapter
    if (!story.chapters || story.chapters.length === 0) {
      throw new BadRequestException('Truyện phải có ít nhất 1 chương trước khi xuất bản');
    }

    try {
      return await this.prisma.story.update({
        where: { id },
        data: {
          isPublished: true,
          status: story.status === StoryStatus.DRAFT ? StoryStatus.ONGOING : story.status,
        },
        include: storyInclude,
      });
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        return await this.prisma.story.update({
          where: { id },
          data: {
            isPublished: true,
            status: story.status === StoryStatus.DRAFT ? StoryStatus.ONGOING : story.status,
          },
          select: safeStorySelect,
        });
      }
      throw error;
    }
  }

  async incrementViewCount(slugOrId: string) {
    // Try ID first if it looks like an ID (20-26 chars, alphanumeric, starts with letter)
    const looksLikeId = (slugOrId.length >= 20 && slugOrId.length <= 26) &&
      /^[a-z][a-z0-9]{19,25}$/i.test(slugOrId);
    let whereClause: { id: string } | { slug: string };

    if (looksLikeId) {
      // Try ID first
      const story = await this.prisma.story.findUnique({
        where: { id: slugOrId },
        select: { id: true },
      });
      if (story) {
        whereClause = { id: slugOrId };
      } else {
        whereClause = { slug: slugOrId };
      }
    } else {
      whereClause = { slug: slugOrId };
    }

    await this.prisma.story.update({
      where: whereClause,
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

    try {
      const stories = await this.prisma.story.findMany({
        where,
        include: storyInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      return createPaginatedResult(stories, total, page, limit);
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        const stories = await this.prisma.story.findMany({
          where,
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            coverImage: true,
            authorId: true,
            authorName: true,
            status: true,
            isPublished: true,
            viewCount: true,
            likeCount: true,
            followCount: true,
            rating: true,
            ratingCount: true,
            country: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            lastChapterAt: true,
            author: storyInclude.author,
            storyCategories: storyInclude.storyCategories,
            storyTags: storyInclude.storyTags,
            _count: storyInclude._count,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        });

        return createPaginatedResult(stories, total, page, limit);
      }
      throw error;
    }
  }

  // Get newest stories (10-20 stories)
  async getNewest(limit: number = 15) {
    try {
      return await this.prisma.story.findMany({
        where: {
          isPublished: true,
          status: StoryStatus.PUBLISHED,
        },
        include: storyInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error: any) {
      // If column doesn't exist, use select instead of include
      if (error?.message?.includes('isRecommended')) {
        return await this.prisma.story.findMany({
          where: {
            isPublished: true,
            status: StoryStatus.PUBLISHED,
          },
          select: safeStorySelect,
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
      }
      throw error;
    }
  }

  // Get best of month (highest rating based on ratings created in current month)
  async getBestOfMonth(limit: number = 15) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Get stories with ratings created in current month
      const storiesWithMonthlyRatings = await this.prisma.story.findMany({
        where: {
          isPublished: true,
          status: StoryStatus.PUBLISHED,
          ratings: {
            some: {
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          },
        },
        include: {
          ...storyInclude,
          ratings: {
            where: {
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          },
        },
      });

      // Calculate average rating for current month
      const storiesWithMonthlyRating = storiesWithMonthlyRatings.map(story => {
        const monthlyRatings = story.ratings;
        const avgRating = monthlyRatings.length > 0
          ? monthlyRatings.reduce((sum, r) => sum + r.rating, 0) / monthlyRatings.length
          : 0;
        return {
          ...story,
          monthlyRating: avgRating,
          monthlyRatingCount: monthlyRatings.length,
        };
      });

      // Sort by monthly rating (desc) and rating count (desc)
      const sorted = storiesWithMonthlyRating
        .sort((a, b) => {
          if (b.monthlyRating !== a.monthlyRating) {
            return b.monthlyRating - a.monthlyRating;
          }
          return b.monthlyRatingCount - a.monthlyRatingCount;
        })
        .slice(0, limit)
        .map(({ monthlyRating, monthlyRatingCount, ratings, ...story }) => story);

      return sorted;
    } catch (error: any) {
      // If column doesn't exist, fallback to newest stories
      if (error?.message?.includes('isRecommended')) {
        return this.getNewest(limit);
      }
      throw error;
    }
  }

  // Get recommended stories (prioritize isRecommended, then algorithm: weighted score)
  async getRecommended(limit: number = 15) {
    try {
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

      // Check if isRecommended field exists (column may not exist in DB yet)
      const hasIsRecommended = stories.length > 0 && 'isRecommended' in (stories[0] as any);
      const recommendedStories = hasIsRecommended
        ? stories.filter(s => (s as any).isRecommended)
        : [];
      const nonRecommendedStories = hasIsRecommended
        ? stories.filter(s => !(s as any).isRecommended)
        : stories;

      // Calculate recommendation score for all stories
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

      // Sort: recommended first (by score), then non-recommended (by score)
      const sortedRecommended = hasIsRecommended
        ? scoredStories
          .filter(s => (s as any).isRecommended)
          .sort((a, b) => b.recommendationScore - a.recommendationScore)
        : [];

      const sortedNonRecommended = hasIsRecommended
        ? scoredStories
          .filter(s => !(s as any).isRecommended)
          .sort((a, b) => b.recommendationScore - a.recommendationScore)
        : scoredStories.sort((a, b) => b.recommendationScore - a.recommendationScore);

      // Combine: recommended first, then non-recommended
      const combined = [...sortedRecommended, ...sortedNonRecommended];

      // If no recommended stories, return newest stories
      if (!hasIsRecommended || recommendedStories.length === 0) {
        return nonRecommendedStories
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      }

      // Return top stories (prioritizing recommended)
      return combined
        .slice(0, limit)
        .map(({ recommendationScore, ...story }) => story);
    } catch (error: any) {
      // If column doesn't exist, fallback to newest stories
      if (error?.message?.includes('isRecommended')) {
        return this.getNewest(limit);
      }
      throw error;
    }
  }

  // Get top rated stories (based on rating and ratingCount)
  async getTopRated(limit: number = 15) {
    try {
      return await this.prisma.story.findMany({
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
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        return await this.prisma.story.findMany({
          where: {
            isPublished: true,
            status: StoryStatus.PUBLISHED,
            ratingCount: {
              gte: 5,
            },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            coverImage: true,
            authorId: true,
            authorName: true,
            status: true,
            isPublished: true,
            viewCount: true,
            likeCount: true,
            followCount: true,
            rating: true,
            ratingCount: true,
            country: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            lastChapterAt: true,
            author: storyInclude.author,
            storyCategories: storyInclude.storyCategories,
            storyTags: storyInclude.storyTags,
            _count: storyInclude._count,
          },
          orderBy: [
            { rating: 'desc' },
            { ratingCount: 'desc' },
          ],
          take: limit,
        });
      }
      throw error;
    }
  }

  // Get most liked stories (based on likeCount and followCount)
  async getMostLiked(limit: number = 15) {
    try {
      return await this.prisma.story.findMany({
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
    } catch (error: any) {
      // If column doesn't exist, use select instead
      if (error?.message?.includes('isRecommended')) {
        return await this.prisma.story.findMany({
          where: {
            isPublished: true,
            status: StoryStatus.PUBLISHED,
          },
          select: safeStorySelect,
          orderBy: [
            { likeCount: 'desc' },
            { followCount: 'desc' },
          ],
          take: limit,
        });
      }
      throw error;
    }
  }

  async likeStory(userId: string, storyId: string) {
    // Check if story exists
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    // Check if already liked
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId,
        },
      },
    });

    if (existingFavorite) {
      throw new BadRequestException('Bạn đã thích truyện này rồi');
    }

    // Create favorite and increment likeCount in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const favorite = await tx.favorite.create({
        data: {
          userId,
          storyId,
        },
      });

      await tx.story.update({
        where: { id: storyId },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });

      return favorite;
    });

    return result;
  }

  async unlikeStory(userId: string, storyId: string) {
    // Check if favorite exists
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Bạn chưa thích truyện này');
    }

    // Delete favorite and decrement likeCount in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.favorite.delete({
        where: {
          userId_storyId: {
            userId,
            storyId,
          },
        },
      });

      await tx.story.update({
        where: { id: storyId },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });

      return { success: true };
    });

    return result;
  }

  async isLiked(userId: string, storyId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId,
        },
      },
    });

    return !!favorite;
  }

  async getLikedStories(userId: string, page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
      page,
      limit,
    });

    const where = { userId };

    const total = await this.prisma.favorite.count({ where });

    const favorites = await this.prisma.favorite.findMany({
      where,
      include: {
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            description: true,
            authorName: true,
            viewCount: true,
            likeCount: true,
            followCount: true,
            rating: true,
            ratingCount: true,
            lastChapterAt: true,
            isPublished: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    return createPaginatedResult(favorites, total, pageNum, limitNum);
  }

  // Get similar stories based on categories and tags
  async getSimilarStories(storyId: string, limit: number = 10) {
    // Get current story
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        storyCategories: { include: { category: true } },
        storyTags: { include: { tag: true } },
      },
    });

    if (!story) {
      throw new NotFoundException('Truyện không tồn tại');
    }

    // Get category IDs
    const categoryIds = story.storyCategories.map(sc => sc.categoryId);

    // Get tag IDs
    const tagIds = story.storyTags.map(st => st.tagId);

    // If no categories or tags, return empty
    if (categoryIds.length === 0 && tagIds.length === 0) {
      return [];
    }

    // Find similar stories based on categories and tags
    const similarStories = await this.prisma.story.findMany({
      where: {
        id: { not: storyId },
        isPublished: true,
        status: StoryStatus.PUBLISHED,
        OR: [
          ...(categoryIds.length > 0 ? [{
            storyCategories: {
              some: {
                categoryId: { in: categoryIds },
              },
            },
          }] : []),
          ...(tagIds.length > 0 ? [{
            storyTags: {
              some: {
                tagId: { in: tagIds },
              },
            },
          }] : []),
        ],
      },
      include: storyInclude,
      orderBy: [
        { rating: 'desc' },
        { viewCount: 'desc' },
      ],
      take: limit,
    });

    return similarStories;
  }

  // Get recommended stories based on user's reading history
  async getRecommendedStories(userId: string, limit: number = 10) {
    // Get user's reading history
    const readingHistory = await this.prisma.readingHistory.findMany({
      where: { userId },
      include: {
        story: {
          include: {
            storyCategories: { include: { category: true } },
            storyTags: { include: { tag: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20, // Get last 20 stories user read
    });

    if (readingHistory.length === 0) {
      // If no reading history, return popular stories
      return this.getTopRated(limit);
    }

    // Extract categories and tags from reading history
    const categoryIds = new Set<string>();
    const tagIds = new Set<string>();
    const readStoryIds = new Set<string>();

    readingHistory.forEach(rh => {
      readStoryIds.add(rh.storyId);
      rh.story.storyCategories.forEach(sc => categoryIds.add(sc.categoryId));
      rh.story.storyTags.forEach(st => tagIds.add(st.tagId));
    });

    // If no categories or tags found, return popular stories
    if (categoryIds.size === 0 && tagIds.size === 0) {
      return this.getTopRated(limit);
    }

    // Find recommended stories based on user's reading history
    const recommendedStories = await this.prisma.story.findMany({
      where: {
        id: { notIn: Array.from(readStoryIds) },
        isPublished: true,
        status: StoryStatus.PUBLISHED,
        OR: [
          ...(categoryIds.size > 0 ? [{
            storyCategories: {
              some: {
                categoryId: { in: Array.from(categoryIds) },
              },
            },
          }] : []),
          ...(tagIds.size > 0 ? [{
            storyTags: {
              some: {
                tagId: { in: Array.from(tagIds) },
              },
            },
          }] : []),
        ],
      },
      include: storyInclude,
      orderBy: [
        { rating: 'desc' },
        { viewCount: 'desc' },
      ],
      take: limit,
    });

    // If not enough recommendations, fill with popular stories
    if (recommendedStories.length < limit) {
      const popularStories = await this.getTopRated(limit - recommendedStories.length);
      const popularIds = new Set(recommendedStories.map(s => s.id));
      const additionalStories = popularStories.filter(s => !popularIds.has(s.id));
      return [...recommendedStories, ...additionalStories].slice(0, limit);
    }

    return recommendedStories;
  }
}

