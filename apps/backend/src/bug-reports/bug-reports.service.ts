import { Injectable, NotFoundException } from '@nestjs/common';
import { BugPlatform, BugReportStatus, BugSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBugReportDto } from './dto/create-bug-report.dto';
import { UpdateBugReportDto } from './dto/update-bug-report.dto';

const REPORTER_SELECT = {
  select: { id: true, username: true, displayName: true },
} as const;

@Injectable()
export class BugReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateBugReportDto) {
    return this.prisma.bugReport.create({
      data: {
        reporterId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        platform: dto.platform ?? BugPlatform.WEB,
        severity: dto.severity ?? BugSeverity.MEDIUM,
        pageUrl: dto.pageUrl?.trim() || null,
        deviceInfo: dto.deviceInfo?.trim() || null,
        appVersion: dto.appVersion?.trim() || null,
      },
      select: {
        id: true,
        title: true,
        platform: true,
        severity: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async listMine(reporterId: string) {
    return this.prisma.bugReport.findMany({
      where: { reporterId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        platform: true,
        severity: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });
  }

  async listAll(opts: {
    page?: number;
    limit?: number;
    status?: BugReportStatus;
    platform?: BugPlatform;
    severity?: BugSeverity;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const where: Prisma.BugReportWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.platform ? { platform: opts.platform } : {}),
      ...(opts.severity ? { severity: opts.severity } : {}),
    };
    const [total, data] = await Promise.all([
      this.prisma.bugReport.count({ where }),
      this.prisma.bugReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { reporter: REPORTER_SELECT },
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

  async getOne(id: string) {
    const report = await this.prisma.bugReport.findUnique({
      where: { id },
      include: { reporter: REPORTER_SELECT },
    });
    if (!report) throw new NotFoundException('Bug report không tồn tại');
    return report;
  }

  async update(id: string, dto: UpdateBugReportDto) {
    const report = await this.prisma.bugReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Bug report không tồn tại');

    const closing =
      dto.status === BugReportStatus.RESOLVED || dto.status === BugReportStatus.CLOSED;
    return this.prisma.bugReport.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.severity ? { severity: dto.severity } : {}),
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote.trim() || null } : {}),
        // Đánh dấu thời điểm đóng; mở lại (OPEN/IN_PROGRESS) thì xoá mốc.
        ...(dto.status ? { resolvedAt: closing ? new Date() : null } : {}),
      },
      include: { reporter: REPORTER_SELECT },
    });
  }
}
