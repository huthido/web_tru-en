import { Injectable, NotFoundException } from '@nestjs/common';
import { vnDay } from '../common/vn-day';
import { PrismaService } from '../prisma/prisma.service';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ReadingHistoryService {
  constructor(private prisma: PrismaService) { }

  /**
   * Calculate story progress based on formula:
   * Progress = ((Chapters đã đọc + progress chapter hiện tại/100) / Tổng số chapter) * 100
   * 
   * @param storyId - Story ID
   * @param currentChapterId - Current chapter being read
   * @param currentChapterProgress - Progress of current chapter (0-100)
   * @returns Story progress (0-100)
   */
  private async calculateStoryProgress(
    storyId: string,
    currentChapterId: string | null,
    currentChapterProgress: number
  ): Promise<number> {
    // Get all published chapters of the story, ordered by order
    const chapters = await this.prisma.chapter.findMany({
      where: {
        storyId,
        isPublished: true,
      },
      select: {
        id: true,
        order: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    if (chapters.length === 0) {
      console.log('calculateStoryProgress: No chapters found for story:', storyId);
      return 0;
    }

    // Find current chapter
    const currentChapter = chapters.find((ch) => ch.id === currentChapterId);
    if (!currentChapter) {
      console.log('calculateStoryProgress: Current chapter not found:', currentChapterId);
      return 0;
    }

    // Count chapters with order < current chapter order (fully read chapters)
    // These are chapters that have been completely read
    const chaptersRead = chapters.filter(
      (ch) => ch.order < currentChapter.order
    ).length;

    // Calculate contribution of current chapter
    // If current chapter is 100% complete, it counts as 1 full chapter
    // Otherwise, it contributes proportionally (0-1)
    const currentChapterContribution = currentChapterProgress / 100;

    // Calculate story progress
    // Formula: ((Chapters đã đọc + progress chapter hiện tại/100) / Tổng số chapter) * 100
    const storyProgress =
      ((chaptersRead + currentChapterContribution) / chapters.length) * 100;

    // Round to 2 decimal places and ensure it's between 0-100
    const roundedProgress = Math.min(100, Math.max(0, Math.round(storyProgress * 100) / 100));

    // If current chapter is the last chapter and progress is 100%, story should be 100%
    const isLastChapter = currentChapter.order === Math.max(...chapters.map(ch => ch.order));
    if (isLastChapter && currentChapterProgress >= 100) {
      console.log('calculateStoryProgress: Last chapter completed, returning 100%');
      return 100;
    }

    console.log('calculateStoryProgress:', {
      storyId,
      currentChapterId,
      currentChapterOrder: currentChapter.order,
      maxChapterOrder: Math.max(...chapters.map(ch => ch.order)),
      isLastChapter,
      currentChapterProgress,
      totalChapters: chapters.length,
      chaptersRead,
      currentChapterContribution,
      storyProgress: roundedProgress,
    });

    return roundedProgress;
  }

  async saveProgress(userId: string, chapterId: string, progress: number) {
    console.log('saveProgress called:', { userId, chapterId, progress });

    // Validate progress (0-100)
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    // Check if chapter exists
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        storyId: true,
        isPublished: true,
        story: {
          select: {
            id: true,
            authorId: true,
            isPublished: true,
          },
        },
      },
    });

    if (!chapter) {
      console.error('Chapter not found:', chapterId);
      throw new NotFoundException('Chương không tồn tại');
    }

    console.log('Chapter found:', { chapterId: chapter.id, storyId: chapter.storyId });

    // Nhiệm vụ "đọc hết N chương": đọc tới ≥80% chương thì tính 1 lượt/ngày
    // (unique theo chương — đọc lại không cộng). Không chặn luồng lưu tiến độ.
    // Chỉ chương đã xuất bản của truyện đã xuất bản mới tính nhiệm vụ.
    if (progress >= 80 && chapter.isPublished && chapter.story?.isPublished) {
      this.prisma.userDailyActivity
        .createMany({
          data: [{ userId, day: vnDay(), kind: 'read', refId: chapterId }],
          skipDuplicates: true,
        })
        .catch(() => undefined);
    }

    // Upsert reading history by storyId (one entry per story per user)
    // When reading a new chapter of the same story, update the existing entry
    const existingHistory = await this.prisma.readingHistory.findFirst({
      where: {
        userId,
        storyId: chapter.storyId,
      },
    });

    const history = existingHistory
      ? await this.prisma.readingHistory.update({
        where: { id: existingHistory.id },
        data: {
          chapterId, // Update to current chapter
          progress,  // Update progress of current chapter
          lastRead: new Date(),
        },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              storyId: true,
            },
          },
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              description: true,
              authorName: true,
              viewCount: true,
              rating: true,
              ratingCount: true,
            },
          },
        } as any, // Type assertion needed until Prisma client is regenerated
      })
      : await this.prisma.readingHistory.create({
        data: {
          userId,
          chapterId,
          storyId: chapter.storyId,
          progress,
          lastRead: new Date(),
        },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              storyId: true,
            },
          },
          story: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              description: true,
              authorName: true,
              viewCount: true,
              rating: true,
              ratingCount: true,
            },
          },
        } as any, // Type assertion needed until Prisma client is regenerated
      });

    // Calculate story progress
    const storyProgress = await this.calculateStoryProgress(
      chapter.storyId,
      chapterId,
      progress
    );

    // Story is already included at top level
    const result = {
      ...history,
      storyProgress, // Add calculated story progress
    };

    console.log('Reading history saved:', {
      id: result.id,
      userId: result.userId,
      chapterId: result.chapterId,
      progress: result.progress,
      storyProgress: result.storyProgress,
    });

    return result;
  }

  async getHistory(userId: string, page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
      page,
      limit,
    });

    const where = { userId };

    const total = await this.prisma.readingHistory.count({ where });

    const history = await this.prisma.readingHistory.findMany({
      where,
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            storyId: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            description: true,
            authorName: true,
            viewCount: true,
            rating: true,
            ratingCount: true,
          },
        },
      } as any, // Type assertion needed until Prisma client is regenerated
      orderBy: {
        lastRead: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Calculate story progress for each history entry
    const historyWithProgress = await Promise.all(
      history.map(async (item) => {
        const chapterId: string = item.chapterId ?? '';
        const storyProgress = await this.calculateStoryProgress(
          item.storyId ?? '',
          chapterId,
          item.progress
        );
        return {
          ...item,
          storyProgress,
        };
      })
    );

    return createPaginatedResult(historyWithProgress, total, pageNum, limitNum);
  }

  async getStoryProgress(userId: string, storyId: string) {
    const history = await this.prisma.readingHistory.findUnique({
      where: { userId_storyId: { userId, storyId } },
      select: {
        progress: true,
        lastRead: true,
        chapter: { select: { id: true, slug: true, title: true, order: true, isPublished: true } },
      },
    });
    if (!history?.chapter || !history.chapter.isPublished) return null;
    const { isPublished, ...chapter } = history.chapter;
    return { progress: history.progress, lastRead: history.lastRead, chapter };
  }

  async getChapterProgress(userId: string, chapterId: string) {
    // First get the chapter to find its storyId
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { storyId: true },
    });

    if (!chapter) {
      return { progress: 0, lastRead: null };
    }

    // Find reading history by storyId (one entry per story)
    const history = await this.prisma.readingHistory.findFirst({
      where: {
        userId,
        storyId: chapter.storyId,
      },
      select: {
        progress: true,
        lastRead: true,
        chapterId: true, // Return current chapterId to check if it matches
      },
    });

    // Only return progress if the current chapter matches the saved chapter
    if (history && history.chapterId === chapterId) {
      return { progress: history.progress, lastRead: history.lastRead };
    }

    return { progress: 0, lastRead: null };
  }

  async clearHistory(userId: string) {
    await this.prisma.readingHistory.deleteMany({
      where: { userId },
    });

    return { success: true, message: 'Lịch sử đọc đã được xóa' };
  }

  async getContinueReading(userId: string, limit: number = 10) {
    // Get the most recent reading history entries, grouped by story
    // We want the latest chapter read for each story
    const history = await this.prisma.readingHistory.findMany({
      where: { userId },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            storyId: true,
          },
        },
        story: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            description: true,
            authorName: true,
            viewCount: true,
            rating: true,
            ratingCount: true,
            lastChapterAt: true,
          },
        },
      } as any, // Type assertion needed until Prisma client is regenerated
      orderBy: {
        lastRead: 'desc',
      },
      take: limit, // Now we have one entry per story, so just take the limit
    });

    // Calculate story progress for each history entry
    const historyWithProgress = await Promise.all(
      history.map(async (item) => {
        const chapterId: string = item.chapterId ?? '';
        const storyProgress = await this.calculateStoryProgress(
          item.storyId ?? '',
          chapterId,
          item.progress
        );
        return {
          ...item,
          storyProgress,
        };
      })
    );

    return historyWithProgress;
  }
}

