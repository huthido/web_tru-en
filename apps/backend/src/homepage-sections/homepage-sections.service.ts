import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { ReorderHomepageSectionsDto } from './dto/reorder-homepage-sections.dto';

@Injectable()
export class HomepageSectionsService {
  private readonly logger = new Logger(HomepageSectionsService.name);

  constructor(private prisma: PrismaService) {}

  /** Lấy tất cả sections (admin: kèm cả inactive, kèm manual stories). */
  async findAll() {
    return this.prisma.homepageSection.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        stories: {
          include: {
            story: {
              select: {
                id: true, title: true, slug: true, coverImage: true,
                authorName: true, viewCount: true, rating: true,
                ratingCount: true, likeCount: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /** Lấy sections đang active (dùng cho homepage). */
  async findActive() {
    return this.prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        stories: {
          include: {
            story: {
              select: {
                id: true, title: true, slug: true, coverImage: true,
                authorName: true, viewCount: true, rating: true,
                ratingCount: true, likeCount: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /** Lấy 1 section theo id. */
  async findOne(id: string) {
    const section = await this.prisma.homepageSection.findUnique({
      where: { id },
      include: {
        stories: {
          include: {
            story: {
              select: {
                id: true, title: true, slug: true, coverImage: true,
                authorName: true, viewCount: true, rating: true,
                ratingCount: true, likeCount: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!section) throw new NotFoundException('Homepage section không tồn tại');
    return section;
  }

  /** Lấy section theo key. */
  async findByKey(key: string) {
    return this.prisma.homepageSection.findUnique({ where: { key } });
  }

  /** Tạo section mới. */
  async create(dto: CreateHomepageSectionDto) {
    const existing = await this.prisma.homepageSection.findUnique({ where: { key: dto.key } });
    if (existing) throw new Error(`Key "${dto.key}" đã tồn tại`);

    if (dto.order === undefined || dto.order === null) {
      const maxOrder = await this.prisma.homepageSection.aggregate({ _max: { order: true } });
      dto.order = (maxOrder._max.order ?? -1) + 1;
    }

    return this.prisma.homepageSection.create({ data: dto });
  }

  /** Cập nhật section. */
  async update(id: string, dto: UpdateHomepageSectionDto) {
    await this.findOne(id);
    return this.prisma.homepageSection.update({ where: { id }, data: dto });
  }

  /** Xoá section (cascade xoá manual stories). */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.homepageSection.delete({ where: { id } });
  }

  /** Sắp xếp lại thứ tự nhiều sections. */
  async reorder(dto: ReorderHomepageSectionsDto) {
    const updates = dto.items.map((item) =>
      this.prisma.homepageSection.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.findAll();
  }

  // ─── Manual stories management ────────────────────────────────

  /** Thêm truyện vào section (mode=manual). */
  async addStory(sectionId: string, storyId: string) {
    const section = await this.findOne(sectionId);
    if (section.mode !== 'manual') {
      throw new Error('Section này đang ở chế độ auto. Chuyển sang manual trước.');
    }

    // Auto-assign order
    const maxOrder = await this.prisma.homepageSectionStory.aggregate({
      _max: { order: true },
      where: { sectionId },
    });

    const existing = await this.prisma.homepageSectionStory.findUnique({
      where: { sectionId_storyId: { sectionId, storyId } },
    });
    if (existing) throw new Error('Truyện đã có trong section này');

    return this.prisma.homepageSectionStory.create({
      data: {
        sectionId,
        storyId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  /** Xoá truyện khỏi section. */
  async removeStory(sectionId: string, storyId: string) {
    return this.prisma.homepageSectionStory.delete({
      where: { sectionId_storyId: { sectionId, storyId } },
    });
  }

  /** Sắp xếp lại thứ tự truyện trong section. */
  async reorderStories(sectionId: string, items: { id: string; order: number }[]) {
    const updates = items.map((item) =>
      this.prisma.homepageSectionStory.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.findOne(sectionId);
  }

  /** Tìm kiếm truyện để thêm vào section (search theo title/slug). */
  async searchStories(query: string, sectionId: string, limit: number = 20) {
    const section = await this.findOne(sectionId);
    const existingStoryIds = section.stories.map((s) => s.storyId);

    return this.prisma.story.findMany({
      where: {
        isPublished: true,
        id: { notIn: existingStoryIds },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, title: true, slug: true, coverImage: true,
        authorName: true, viewCount: true, rating: true,
      },
      take: limit,
      orderBy: { viewCount: 'desc' },
    });
  }

  /** Seed default sections nếu DB trống. */
  async seedDefaults() {
    const count = await this.prisma.homepageSection.count();
    if (count > 0) return;

    const defaults = [
      { key: 'newest', label: 'Mới nhất', sortPath: 'newest', algorithm: 'newest', limit: 15, seeMorePath: '/truyen', sortBy: 'newest', order: 0 },
      { key: 'bestOfMonth', label: 'Hay nhất tháng', sortPath: 'best-of-month', algorithm: 'best-of-month', limit: 15, seeMorePath: '/truyen', sortBy: 'viewCount', order: 1 },
      { key: 'topRated', label: 'Đánh giá cao', sortPath: 'top-rated', algorithm: 'top-rated', limit: 20, seeMorePath: '/truyen', sortBy: 'rating', order: 2 },
      { key: 'recommended', label: 'Đề xuất', sortPath: 'recommended', algorithm: 'recommended', limit: 15, seeMorePath: '/truyen', sortBy: 'popular', order: 3 },
      { key: 'mostLiked', label: 'Yêu thích', sortPath: 'most-liked', algorithm: 'most-liked', limit: 15, seeMorePath: '/truyen', sortBy: 'popular', order: 4 },
    ];

    for (const section of defaults) {
      try {
        await this.prisma.homepageSection.create({ data: section });
      } catch (e: any) {
        this.logger.warn(`Seed skip "${section.key}": ${e.message}`);
      }
    }

    this.logger.log('Seeded 5 default homepage sections');
  }
}
