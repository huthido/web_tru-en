import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UgcReportStatus, UgcReportTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

const ALLOWED_REASONS = new Set([
  'SPAM',
  'ABUSE',
  'ILLEGAL',
  'SEXUAL',
  'HATE',
  'COPYRIGHT',
  'OTHER',
]);

@Injectable()
export class UgcReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const reason = dto.reason.trim().toUpperCase();
    if (!ALLOWED_REASONS.has(reason)) {
      throw new BadRequestException('Lý do báo cáo không hợp lệ');
    }
    if (dto.targetType === UgcReportTargetType.USER && dto.targetId === reporterId) {
      throw new BadRequestException('Không thể tự báo cáo chính mình');
    }
    return this.prisma.ugcReport.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason,
        note: dto.note?.trim() || null,
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async listAll(opts: {
    page?: number;
    limit?: number;
    status?: UgcReportStatus;
    targetType?: UgcReportTargetType;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    // Query string chưa qua ValidationPipe (controller nhận string thô), nên
    // kiểm tra tay: giá trị lạ phải là 400 chứ không để Prisma ném thành 500.
    if (opts.status && !(opts.status in UgcReportStatus)) {
      throw new BadRequestException(
        `Trạng thái không hợp lệ (chỉ nhận ${Object.keys(UgcReportStatus).join(', ')})`,
      );
    }
    if (opts.targetType && !(opts.targetType in UgcReportTargetType)) {
      throw new BadRequestException(
        `Loại nội dung không hợp lệ (chỉ nhận ${Object.keys(UgcReportTargetType).join(', ')})`,
      );
    }
    const where: Prisma.UgcReportWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.targetType ? { targetType: opts.targetType } : {}),
    };
    const [total, data] = await Promise.all([
      this.prisma.ugcReport.count({ where }),
      this.prisma.ugcReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: { select: { id: true, username: true, displayName: true } },
          resolvedBy: { select: { id: true, username: true } },
        },
      }),
    ]);
    const targets = await this.resolveTargets(data);

    return {
      data: data.map((r) => ({
        ...r,
        // Bảng ugc_reports chỉ lưu targetType + targetId; admin cần thấy nội
        // dung thật mới xử lý được nên đính kèm bản mô tả + link công khai.
        target: targets.get(`${r.targetType}:${r.targetId}`) ?? {
          label: 'Nội dung đã bị xoá',
          url: null,
          deleted: true,
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Nạp thông tin nội dung bị báo cáo theo lô (mỗi loại một query) rồi trả về
   * map khoá `targetType:targetId`.
   */
  private async resolveTargets(
    reports: { targetType: UgcReportTargetType; targetId: string }[],
  ) {
    const idsOf = (type: UgcReportTargetType) => [
      ...new Set(reports.filter((r) => r.targetType === type).map((r) => r.targetId)),
    ];
    const storyIds = idsOf(UgcReportTargetType.STORY);
    const chapterIds = idsOf(UgcReportTargetType.CHAPTER);
    const commentIds = idsOf(UgcReportTargetType.COMMENT);
    const userIds = idsOf(UgcReportTargetType.USER);
    const paintingIds = idsOf(UgcReportTargetType.PAINTING);

    const [stories, chapters, comments, users, paintings] = await Promise.all([
      storyIds.length
        ? this.prisma.story.findMany({
            where: { id: { in: storyIds } },
            select: { id: true, title: true, slug: true },
          })
        : [],
      chapterIds.length
        ? this.prisma.chapter.findMany({
            where: { id: { in: chapterIds } },
            select: {
              id: true,
              title: true,
              slug: true,
              story: { select: { title: true, slug: true } },
            },
          })
        : [],
      commentIds.length
        ? this.prisma.comment.findMany({
            where: { id: { in: commentIds } },
            select: {
              id: true,
              content: true,
              isDeleted: true,
              story: { select: { slug: true } },
              chapter: { select: { slug: true, story: { select: { slug: true } } } },
            },
          })
        : [],
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, displayName: true, profileSlug: true },
          })
        : [],
      paintingIds.length
        ? this.prisma.painting.findMany({
            where: { id: { in: paintingIds } },
            select: {
              id: true,
              title: true,
              imageUrl: true,
              author: { select: { username: true, displayName: true } },
            },
          })
        : [],
    ]);

    const map = new Map<
      string,
      {
        label: string;
        url: string | null;
        imageUrl?: string | null;
        authorName?: string | null;
        deleted?: boolean;
      }
    >();

    for (const s of stories) {
      map.set(`STORY:${s.id}`, { label: s.title, url: `/truyen/${s.slug}` });
    }
    for (const c of chapters) {
      map.set(`CHAPTER:${c.id}`, {
        label: `${c.story?.title ?? 'Truyện đã xoá'} — ${c.title}`,
        url: c.story ? `/truyen/${c.story.slug}/chuong/${c.slug}` : null,
      });
    }
    for (const c of comments) {
      const storySlug = c.chapter?.story?.slug ?? c.story?.slug ?? null;
      map.set(`COMMENT:${c.id}`, {
        label: c.isDeleted
          ? '[Bình luận đã bị xoá]'
          : c.content.slice(0, 200) + (c.content.length > 200 ? '…' : ''),
        url: storySlug
          ? c.chapter
            ? `/truyen/${storySlug}/chuong/${c.chapter.slug}`
            : `/truyen/${storySlug}`
          : null,
      });
    }
    for (const u of users) {
      map.set(`USER:${u.id}`, {
        label: u.displayName || u.username,
        url: `/u/${u.profileSlug || u.username}`,
      });
    }
    for (const p of paintings) {
      map.set(`PAINTING:${p.id}`, {
        label: p.title,
        // Tranh không có trang riêng — trỏ về gian hàng tranh của tác giả.
        url: `/u/${p.author.username}/tranh`,
        imageUrl: p.imageUrl,
        authorName: p.author.displayName || p.author.username,
      });
    }

    return map;
  }

  async resolve(id: string, resolverId: string, status: UgcReportStatus) {
    const report = await this.prisma.ugcReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');
    if (report.status !== UgcReportStatus.PENDING) {
      throw new ForbiddenException('Báo cáo đã được xử lý');
    }
    return this.prisma.ugcReport.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedById: resolverId,
      },
    });
  }
}
