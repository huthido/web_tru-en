import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AdSourceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdSlotDto } from './dto/create-ad-slot.dto';
import { UpdateAdSlotDto } from './dto/update-ad-slot.dto';

/**
 * Quản lý AdSlot registry: CRUD + lookup ads thuộc 1 slot.
 *
 * Logic filter ads-of-slot dồn vào đây thay vì AdsService.findActiveAds() vì:
 * - Slot biết platform/adType filter của riêng nó (override platform query param).
 * - Sort theo AdSlotBinding.priority, không phải Ad.priority chung.
 */
@Injectable()
export class AdSlotsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateAdSlotDto) {
        const existing = await this.prisma.adSlot.findUnique({
            where: { key: dto.key },
        });
        if (existing) {
            throw new BadRequestException(`Slot key "${dto.key}" đã tồn tại.`);
        }
        return this.prisma.adSlot.create({
            data: {
                key: dto.key,
                pageKey: dto.pageKey,
                position: dto.position,
                label: dto.label,
                maxAds: dto.maxAds ?? 1,
                enabled: dto.enabled ?? true,
                adType: dto.adType,
                platform: dto.platform,
            },
        });
    }

    async findAll() {
        return this.prisma.adSlot.findMany({
            orderBy: [{ pageKey: 'asc' }, { key: 'asc' }],
            include: {
                _count: { select: { bindings: true } },
            },
        });
    }

    async findOne(id: string) {
        const slot = await this.prisma.adSlot.findUnique({
            where: { id },
            include: {
                bindings: {
                    include: { ad: true },
                    orderBy: { priority: 'desc' },
                },
            },
        });
        if (!slot) throw new NotFoundException('Slot không tồn tại.');
        return slot;
    }

    async findByKey(key: string) {
        const slot = await this.prisma.adSlot.findUnique({
            where: { key },
        });
        if (!slot) throw new NotFoundException(`Slot key "${key}" không tồn tại.`);
        return slot;
    }

    async update(id: string, dto: UpdateAdSlotDto) {
        await this.findOne(id); // throw nếu không tồn tại

        // Đổi key thì check duplicate.
        if (dto.key) {
            const dup = await this.prisma.adSlot.findFirst({
                where: { key: dto.key, NOT: { id } },
            });
            if (dup) {
                throw new BadRequestException(`Slot key "${dto.key}" đã tồn tại.`);
            }
        }

        return this.prisma.adSlot.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.adSlot.delete({ where: { id } });
    }

    /**
     * Lấy ds ads active của 1 slot (theo key), đã filter:
     * - slot.enabled = true (else trả mảng rỗng — caller không cần check)
     * - ad.isActive + trong startDate/endDate
     * - ad.type khớp slot.adType (nếu slot set)
     * - sourceType phù hợp platform (web loại ADMOB/FAN, mobile loại ADSENSE/CUSTOM_SCRIPT)
     * - sort theo binding.priority desc, slice maxAds
     *
     * Param `platform` ưu tiên slot.platform nếu set, fallback caller-supplied.
     */
    async findActiveAdsBySlot(key: string, platformParam?: 'web' | 'mobile') {
        const slot = await this.prisma.adSlot.findUnique({
            where: { key },
        });
        if (!slot || !slot.enabled) return { slot, ads: [] as any[] };

        // Slot.platform override platformParam. Null hoặc 'all' -> dùng caller.
        const effectivePlatform =
            slot.platform && slot.platform !== 'all'
                ? (slot.platform as 'web' | 'mobile')
                : platformParam;

        const now = new Date();
        const where: Prisma.AdWhereInput = {
            isActive: true,
            slotBindings: { some: { slotId: slot.id } },
            OR: [
                { AND: [{ startDate: null }, { endDate: null }] },
                { AND: [{ startDate: { lte: now } }, { endDate: null }] },
                { AND: [{ startDate: null }, { endDate: { gte: now } }] },
                { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] },
            ],
        };

        if (slot.adType) where.type = slot.adType;

        if (effectivePlatform) {
            const excludeSources =
                effectivePlatform === 'web'
                    ? [AdSourceType.GOOGLE_ADMOB, AdSourceType.FAN]
                    : [AdSourceType.GOOGLE_ADSENSE, AdSourceType.CUSTOM_SCRIPT];
            where.sourceType = { notIn: excludeSources };
            where.AND = [
                ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
                {
                    OR: [
                        { platform: effectivePlatform },
                        { platform: 'all' },
                        { platform: null },
                    ],
                },
            ];
        }

        // Lấy ads + binding để sort theo binding.priority. Prisma không hỗ trợ
        // orderBy theo bảng nối trực tiếp -> fetch bindings rồi map.
        const bindings = await this.prisma.adSlotBinding.findMany({
            where: { slotId: slot.id, ad: where },
            include: { ad: true },
            orderBy: [{ priority: 'desc' }],
            take: slot.maxAds,
        });

        return {
            slot,
            ads: bindings.map((b) => b.ad),
        };
    }
}
