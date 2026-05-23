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
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
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
