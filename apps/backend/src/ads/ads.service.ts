import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdSourceType, Prisma } from '@prisma/client';
import { CreateAdDto, AdType, AdPosition } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/ad-query.dto';

/**
 * Validate networkConfig theo sourceType. Tạm dùng manual check thay vì class-
 * validator vì class-validator hỗ trợ cross-field/conditional kém. Throw
 * BadRequestException với message Việt nếu thiếu.
 */
function validateAdSource(dto: { sourceType?: string; imageUrl?: string; networkConfig?: Record<string, any> | null }) {
    const src = (dto.sourceType ?? AdSourceType.SELF_SERVED) as AdSourceType;
    const cfg = dto.networkConfig ?? {};
    switch (src) {
        case AdSourceType.SELF_SERVED:
            if (!dto.imageUrl || dto.imageUrl.trim() === '') {
                throw new BadRequestException('SELF_SERVED yêu cầu imageUrl.');
            }
            break;
        case AdSourceType.GOOGLE_ADSENSE:
            if (!cfg.adUnitId || typeof cfg.adUnitId !== 'string') {
                throw new BadRequestException('GOOGLE_ADSENSE yêu cầu networkConfig.adUnitId (data-ad-slot).');
            }
            break;
        case AdSourceType.GOOGLE_ADMOB:
            if (!cfg.adUnitId || typeof cfg.adUnitId !== 'string') {
                throw new BadRequestException('GOOGLE_ADMOB yêu cầu networkConfig.adUnitId (ca-app-pub-X/Y).');
            }
            break;
        case AdSourceType.FAN:
            if (!cfg.placementId || typeof cfg.placementId !== 'string') {
                throw new BadRequestException('FAN yêu cầu networkConfig.placementId.');
            }
            break;
        case AdSourceType.CUSTOM_SCRIPT:
            if (!cfg.html || typeof cfg.html !== 'string' || cfg.html.trim() === '') {
                throw new BadRequestException('CUSTOM_SCRIPT yêu cầu networkConfig.html.');
            }
            break;
    }
}

/**
 * Validate shape của Ad.displayConfig (optional) — chỉ kiểm tra type, không
 * enforce default. Sai shape → throw để admin biết key viết sai.
 */
function validateDisplayConfig(cfg?: Record<string, any> | null) {
    if (!cfg) return;
    if (cfg.heights !== undefined) {
        if (typeof cfg.heights !== 'object' || cfg.heights === null) {
            throw new BadRequestException('displayConfig.heights phải là object {base?,sm?,md?}.');
        }
    }
    if (cfg.rotateInterval !== undefined) {
        const n = Number(cfg.rotateInterval);
        if (!Number.isFinite(n) || n < 1000) {
            throw new BadRequestException('displayConfig.rotateInterval phải là số ≥1000 (ms).');
        }
    }
    if (cfg.maxStack !== undefined) {
        const n = Number(cfg.maxStack);
        if (!Number.isInteger(n) || n < 1) {
            throw new BadRequestException('displayConfig.maxStack phải là integer ≥1.');
        }
    }
    if (cfg.openInNewTab !== undefined && typeof cfg.openInNewTab !== 'boolean') {
        throw new BadRequestException('displayConfig.openInNewTab phải là boolean.');
    }
    if (cfg.customCss !== undefined && typeof cfg.customCss !== 'string') {
        throw new BadRequestException('displayConfig.customCss phải là string.');
    }
}

/** Validate shape của Ad.inlineRule (optional). */
function validateInlineRule(rule?: Record<string, any> | null) {
    if (!rule) return;
    const intFields = ['afterParagraph', 'repeatEvery'] as const;
    for (const f of intFields) {
        if (rule[f] !== undefined) {
            const n = Number(rule[f]);
            if (!Number.isInteger(n) || n < 1) {
                throw new BadRequestException(`inlineRule.${f} phải là integer ≥1.`);
            }
        }
    }
    if (rule.maxOccurrences !== undefined && rule.maxOccurrences !== null) {
        const n = Number(rule.maxOccurrences);
        if (!Number.isInteger(n) || n < 1) {
            throw new BadRequestException('inlineRule.maxOccurrences phải là integer ≥1 hoặc null.');
        }
    }
}

@Injectable()
export class AdsService {
    constructor(private prisma: PrismaService) { }

    async create(createAdDto: CreateAdDto, userId: string) {
        validateAdSource(createAdDto);
        validateDisplayConfig(createAdDto.displayConfig);
        validateInlineRule(createAdDto.inlineRule);

        const slotIds = createAdDto.slotIds ?? [];

        const ad = await this.prisma.ad.create({
            data: {
                title: createAdDto.title,
                description: createAdDto.description,
                imageUrl: createAdDto.imageUrl ?? '',
                linkUrl: createAdDto.linkUrl,
                type: createAdDto.type,
                position: createAdDto.position,
                sourceType: (createAdDto.sourceType ?? 'SELF_SERVED') as AdSourceType,
                networkConfig: (createAdDto.networkConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                displayConfig: (createAdDto.displayConfig ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                inlineRule: (createAdDto.inlineRule ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                platform: createAdDto.platform,
                isActive: createAdDto.isActive,
                startDate: createAdDto.startDate ? new Date(createAdDto.startDate) : null,
                endDate: createAdDto.endDate ? new Date(createAdDto.endDate) : null,
                popupInterval: createAdDto.popupInterval,
                createdById: userId,
                ...(slotIds.length > 0 && {
                    slotBindings: {
                        create: slotIds.map((slotId) => ({ slotId })),
                    },
                }),
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
                slotBindings: { include: { slot: true } },
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
     * Get active ads for display (frontend / mobile).
     * Filter:
     * - isActive = true + trong startDate/endDate.
     * - platform?: 'web' | 'mobile' — chỉ trả ads thuộc platform đó (hoặc null/all).
     *   Mobile gửi 'mobile' để loại AdSense/Custom-HTML; web gửi 'web' để loại AdMob/FAN.
     * - Tự exclude sourceType không phù hợp platform nếu platform truyền vào.
     */
    async findActiveAds(type?: AdType, position?: AdPosition, platform?: 'web' | 'mobile') {
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

        if (platform) {
            // Ad.platform: 'web' | 'mobile' | 'all' | null. Cho qua nếu khớp / 'all' / null
            // (SELF_SERVED thường để null vì image hiển thị được mọi nơi).
            where.AND = (where.AND || []).concat([
                { OR: [{ platform: platform }, { platform: 'all' }, { platform: null }] },
            ]);
            // Loại sourceType không phù hợp platform:
            // - web không nhận GOOGLE_ADMOB / FAN
            // - mobile không nhận GOOGLE_ADSENSE / CUSTOM_SCRIPT (HTML không render được trong RN)
            const excludeSources =
                platform === 'web'
                    ? [AdSourceType.GOOGLE_ADMOB, AdSourceType.FAN]
                    : [AdSourceType.GOOGLE_ADSENSE, AdSourceType.CUSTOM_SCRIPT];
            where.sourceType = { notIn: excludeSources };
        }

        const ads = await this.prisma.ad.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        return ads;
    }

    /**
     * Snapshot cấu hình ads + GDPR cho client. Không expose secret — chỉ
     * public IDs (publisher ID, app ID) cần để init network SDK ở client.
     */
    async getPublicConfig() {
        const settings = await this.prisma.settings.findFirst();
        return {
            adsEnabled: settings?.adsEnabled ?? true,
            consentRequired: settings?.consentRequired ?? true,
            googleAdsensePublisherId: settings?.googleAdsensePublisherId ?? null,
            admobAndroidAppId: settings?.admobAndroidAppId ?? null,
            admobIosAppId: settings?.admobIosAppId ?? null,
            fanPlacementId: settings?.fanPlacementId ?? null,
        };
    }

    /** Text raw từ Settings.adsTxtContent — serve qua /ads.txt cho Google AdSense verify. */
    async getAdsTxt(): Promise<string> {
        const settings = await this.prisma.settings.findFirst();
        return settings?.adsTxtContent ?? '';
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
                slotBindings: { include: { slot: true } },
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

        // Validate khi đổi sourceType hoặc khi cập nhật networkConfig — dùng giá trị mới
        // hoặc fall back giá trị cũ trong DB để check đầy đủ shape.
        const merged = {
            sourceType: (updateAdDto as any).sourceType ?? ad.sourceType,
            imageUrl: (updateAdDto as any).imageUrl ?? ad.imageUrl,
            networkConfig:
                (updateAdDto as any).networkConfig !== undefined
                    ? (updateAdDto as any).networkConfig
                    : (ad.networkConfig as any),
        };
        validateAdSource(merged);
        validateDisplayConfig((updateAdDto as any).displayConfig);
        validateInlineRule((updateAdDto as any).inlineRule);

        const dto = updateAdDto as any;
        // slotIds nằm trong relation, không thể truyền vào data trực tiếp — tách ra.
        const { slotIds, ...rest } = dto;
        const updateData: any = { ...rest };

        if (dto.startDate !== undefined) {
            updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
        }
        if (dto.endDate !== undefined) {
            updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
        }
        if (dto.networkConfig !== undefined) {
            updateData.networkConfig = dto.networkConfig === null ? Prisma.JsonNull : dto.networkConfig;
        }
        if (dto.displayConfig !== undefined) {
            updateData.displayConfig = dto.displayConfig === null ? Prisma.JsonNull : dto.displayConfig;
        }
        if (dto.inlineRule !== undefined) {
            updateData.inlineRule = dto.inlineRule === null ? Prisma.JsonNull : dto.inlineRule;
        }

        // Replace bindings nếu slotIds được truyền (gửi mảng rỗng = xoá hết).
        // Wrap trong transaction để đồng bộ với update Ad.
        const updatedAd = await this.prisma.$transaction(async (tx) => {
            if (Array.isArray(slotIds)) {
                await tx.adSlotBinding.deleteMany({ where: { adId: id } });
                if (slotIds.length > 0) {
                    await tx.adSlotBinding.createMany({
                        data: slotIds.map((slotId: string) => ({ adId: id, slotId })),
                        skipDuplicates: true,
                    });
                }
            }
            return tx.ad.update({
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
                    slotBindings: { include: { slot: true } },
                },
            });
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
     * Track ad impression (view) cho SELF_SERVED ads.
     * 3rd-party (AdSense/AdMob/FAN/Custom) tự tracking trong SDK của họ — skip
     * để tránh double-count và nhiễu analytics tự đếm.
     */
    async trackImpression(
        adId: string,
        metadata: {
            userId?: string;
            ipAddress?: string;
            userAgent?: string;
            device?: string;
        },
    ) {
        // Skip nếu không phải SELF_SERVED — đỡ ghi rác DB.
        const ad = await this.prisma.ad.findUnique({ where: { id: adId }, select: { sourceType: true } });
        if (!ad) return { tracked: false, reason: 'not-found' };
        if (ad.sourceType !== AdSourceType.SELF_SERVED) {
            return { tracked: false, reason: 'third-party-self-tracked' };
        }

        // Check for duplicate impressions (within 1 minute from same user/IP)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

        // Build OR conditions dynamically
        const orConditions: any[] = [];
        if (metadata.userId) {
            orConditions.push({ userId: metadata.userId });
        }
        if (metadata.ipAddress) {
            orConditions.push({ ipAddress: metadata.ipAddress });
        }

        const recentImpression = await this.prisma.adImpression.findFirst({
            where: {
                adId,
                createdAt: { gte: oneMinuteAgo },
                ...(orConditions.length > 0 && { OR: orConditions }),
            },
        });

        if (recentImpression) {
            // Skip duplicate impression
            return { tracked: false, reason: 'duplicate' };
        }

        // Track impression
        await Promise.all([
            this.prisma.adImpression.create({
                data: {
                    adId,
                    userId: metadata.userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    device: metadata.device || this.detectDevice(metadata.userAgent),
                },
            }),
            this.prisma.ad.update({
                where: { id: adId },
                data: {
                    impressions: { increment: 1 },
                    viewCount: { increment: 1 }, // Keep for backward compatibility
                },
            }),
        ]);

        return { tracked: true };
    }

    /**
     * Track ad click cho SELF_SERVED ads. 3rd-party SDK tự đếm.
     */
    async trackClick(
        adId: string,
        metadata: {
            userId?: string;
            ipAddress?: string;
            userAgent?: string;
            device?: string;
        },
    ) {
        const ad = await this.prisma.ad.findUnique({ where: { id: adId }, select: { sourceType: true } });
        if (!ad) return { tracked: false, reason: 'not-found' };
        if (ad.sourceType !== AdSourceType.SELF_SERVED) {
            return { tracked: false, reason: 'third-party-self-tracked' };
        }

        // Check for excessive clicks (max 3 clicks per 5 minutes from same user/IP)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // Build OR conditions dynamically
        const orConditions: any[] = [];
        if (metadata.userId) {
            orConditions.push({ userId: metadata.userId });
        }
        if (metadata.ipAddress) {
            orConditions.push({ ipAddress: metadata.ipAddress });
        }

        const recentClicks = await this.prisma.adClick.count({
            where: {
                adId,
                createdAt: { gte: fiveMinutesAgo },
                ...(orConditions.length > 0 && { OR: orConditions }),
            },
        });

        if (recentClicks >= 3) {
            throw new BadRequestException('Too many clicks. Please try again later.');
        }

        // Track click
        await Promise.all([
            this.prisma.adClick.create({
                data: {
                    adId,
                    userId: metadata.userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    device: metadata.device || this.detectDevice(metadata.userAgent),
                },
            }),
            this.prisma.ad.update({
                where: { id: adId },
                data: {
                    clickCount: { increment: 1 },
                },
            }),
        ]);

        return { tracked: true };
    }

    /**
     * Legacy: Increment view count (deprecated, use trackImpression)
     * @deprecated Use trackImpression instead
     */
    async incrementViewCount(id: string) {
        await this.prisma.ad.update({
            where: { id },
            data: {
                viewCount: { increment: 1 },
            },
        });
    }

    /**
     * Legacy: Increment click count (deprecated, use trackClick)
     * @deprecated Use trackClick instead
     */
    async incrementClickCount(id: string) {
        await this.prisma.ad.update({
            where: { id },
            data: {
                clickCount: { increment: 1 },
            },
        });
    }

    /**
     * Helper: Detect device type from user agent
     */
    private detectDevice(userAgent?: string): string {
        if (!userAgent) return 'unknown';

        const ua = userAgent.toLowerCase();
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|windows phone/i.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }
}

