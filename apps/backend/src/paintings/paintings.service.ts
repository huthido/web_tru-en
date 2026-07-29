import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, PaintingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaintingDto } from './dto/create-painting.dto';
import { UpdatePaintingDto } from './dto/update-painting.dto';

const PAINTING_SELECT = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  price: true,
  contactInfo: true,
  status: true,
  viewCount: true,
  likeCount: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
};

@Injectable()
export class PaintingsService {
  constructor(private prisma: PrismaService) {}

  async getList(params: {
    page?: number;
    limit?: number;
    status?: string;
    authorId?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.PaintingWhereInput = {};
    if (params.status) {
      // Không nhét thẳng query string vào Prisma: giá trị lạ làm Prisma ném
      // lỗi validation và biến thành 500 thay vì 400.
      if (!(params.status in PaintingStatus)) {
        throw new BadRequestException(
          `Trạng thái không hợp lệ (chỉ nhận ${Object.keys(PaintingStatus).join(', ')})`,
        );
      }
      where.status = params.status as PaintingStatus;
    }
    if (params.authorId) where.authorId = params.authorId;

    const [items, total] = await Promise.all([
      this.prisma.painting.findMany({
        where,
        select: PAINTING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.painting.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: string) {
    const painting = await this.prisma.painting.findUnique({
      where: { id },
      select: PAINTING_SELECT,
    });
    if (!painting) throw new NotFoundException('Không tìm thấy tranh');

    await this.prisma.painting.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return painting;
  }

  async create(authorId: string, dto: CreatePaintingDto) {
    const { contactInfo, ...rest } = dto;
    return this.prisma.painting.create({
      data: {
        authorId,
        ...rest,
        ...(contactInfo !== undefined && { contactInfo: contactInfo as Prisma.InputJsonValue }),
      },
      select: PAINTING_SELECT,
    });
  }

  async update(id: string, authorId: string, dto: UpdatePaintingDto) {
    await this.assertOwner(id, authorId);
    const { contactInfo, ...rest } = dto;
    return this.prisma.painting.update({
      where: { id },
      data: {
        ...rest,
        ...(contactInfo !== undefined && { contactInfo: contactInfo as Prisma.InputJsonValue }),
      },
      select: PAINTING_SELECT,
    });
  }

  async delete(id: string, authorId: string) {
    await this.assertOwner(id, authorId);
    await this.prisma.painting.delete({ where: { id } });
    return { success: true };
  }

  async markSold(id: string, authorId: string) {
    await this.assertOwner(id, authorId);
    return this.prisma.painting.update({
      where: { id },
      data: { status: 'SOLD' },
      select: PAINTING_SELECT,
    });
  }

  private async assertOwner(id: string, authorId: string) {
    const painting = await this.prisma.painting.findUnique({ where: { id }, select: { authorId: true } });
    if (!painting) throw new NotFoundException('Không tìm thấy tranh');
    if (painting.authorId !== authorId) throw new ForbiddenException('Không có quyền thực hiện');
  }
}
