import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdDto, AdType, AdPosition } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/ad-query.dto';

@Injectable()
export class AdsService {
    constructor(private prisma: PrismaService) { }

    async create(createAdDto: CreateAdDto, userId: string) {
        const ad = await this.prisma.ad.create({
            data: {
                ...createAdDto,
                startDate: createAdDto.startDate ? new Date(createAdDto.startDate) : null,
                endDate: createAdDto.endDate ? new Date(createAdDto.endDate) : null,
                createdById: userId,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        return ad;
    }

    async findAll(query: AdQueryDto) {
        const where: any = {};

        if (query.type) {
            where.type = query.type;
        }

        if (query.position) {
            where.position = query.position;
        }

        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }

        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const [ads, total] = await Promise.all([
            this.prisma.ad.findMany({
                where,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.ad.count({ where }),
        ]);

        return {
            data: ads,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Get active ads for display (frontend)
     * Only returns ads that are:
     * - isActive = true
     * - Within startDate and endDate (if set)
     * - Current date is between startDate and endDate
     */
    async findActiveAds(type?: AdType, position?: AdPosition) {
        const now = new Date();

        const where: any = {
            isActive: true,
            OR: [
                // Ads with no date restrictions
                {
                    AND: [
                        { startDate: null },
                        { endDate: null },
                    ],
                },
                // Ads with only startDate
                {
                    AND: [
                        { startDate: { lte: now } },
                        { endDate: null },
                    ],
                },
                // Ads with only endDate
                {
                    AND: [
                        { startDate: null },
                        { endDate: { gte: now } },
                    ],
                },
                // Ads with both dates
                {
                    AND: [
                        { startDate: { lte: now } },
                        { endDate: { gte: now } },
                    ],
                },
            ],
        };

        if (type) {
            where.type = type;
        }

        if (position) {
            where.position = position;
        }

        const ads = await this.prisma.ad.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
        });

        return ads;
    }

    async findOne(id: string) {
        const ad = await this.prisma.ad.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        if (!ad) {
            throw new NotFoundException('Quảng cáo không tồn tại');
        }

        return ad;
    }

    async update(id: string, updateAdDto: UpdateAdDto, userId: string) {
        const ad = await this.findOne(id);

        // Check if user is admin or creator
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (user?.role !== 'ADMIN' && ad.createdById !== userId) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa quảng cáo này');
        }

        const updateData: any = { ...updateAdDto };
        const dto = updateAdDto as any;
        if (dto.startDate !== undefined) {
            updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
        }
        if (dto.endDate !== undefined) {
            updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
        }

        const updatedAd = await this.prisma.ad.update({
            where: { id },
            data: updateData,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        return updatedAd;
    }

    async remove(id: string, userId: string) {
        const ad = await this.findOne(id);

        // Check if user is admin or creator
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (user?.role !== 'ADMIN' && ad.createdById !== userId) {
            throw new ForbiddenException('Bạn không có quyền xóa quảng cáo này');
        }

        await this.prisma.ad.delete({
            where: { id },
        });

        return { message: 'Quảng cáo đã được xóa' };
    }

    /**
     * Increment view count for an ad
     */
    async incrementViewCount(id: string) {
        await this.prisma.ad.update({
            where: { id },
            data: {
                viewCount: {
                    increment: 1,
                },
            },
        });
    }

    /**
     * Increment click count for an ad
     */
    async incrementClickCount(id: string) {
        await this.prisma.ad.update({
            where: { id },
            data: {
                clickCount: {
                    increment: 1,
                },
            },
        });
    }
}

