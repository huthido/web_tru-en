import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { generateSlug, generateUniqueSlug } from '../common/utils/slug.util';
import { chapterWithStoryInclude } from '../prisma/prisma.helpers';
import { UserRole, ApprovalType, ApprovalStatus } from '@prisma/client';
import { ApprovalsService } from '../approvals/approvals.service';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class ChaptersService {
    constructor(
        private prisma: PrismaService,
        private approvalsService: ApprovalsService,
        private walletService: WalletService
    ) { }

    /**
     * Reject a paid price so small that the platform fee would leave the
     * author with 0 net coins. 0 (free) is always allowed. Uses the live fee %.
     */
    private async validateChapterPrice(price?: number) {
        if (price === undefined || price <= 0) return;
        const feePercent = await this.walletService.getDonationFeePercent();
        const { net } = WalletService.splitDonation(price, feePercent);
        if (net <= 0) {
            const minPrice = WalletService.minNetPrice(feePercent);
            throw new BadRequestException(
                `Giá chương quá thấp (phí nền tảng ${feePercent}% sẽ ăn hết). Tối thiểu phải là ${minPrice} coin, hoặc để 0 cho miễn phí.`,
            );
        }
    }

    async findAll(storyId: string, includeUnpublished: boolean = false) {
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
            select: { id: true },
        });

        if (!story) {
            throw new NotFoundException('Truyện không tồn tại');
        }

        const where: any = { storyId };
        if (!includeUnpublished) {
            where.isPublished = true;
        }

        return this.prisma.chapter.findMany({
            where,
            include: {
                uploader: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { order: 'asc' },
        });
    }

    async findOne(storySlug: string, chapterSlug: string, userId?: string) {
        // Find story first
        const story = await this.prisma.story.findUnique({
            where: { slug: storySlug },
            select: { id: true, authorId: true, isPublished: true, accessType: true, price: true },
        });

        if (!story) {
            throw new NotFoundException('Truyện không tồn tại');
        }

        // Find chapter
        const chapter = await this.prisma.chapter.findFirst({
            where: {
                storyId: story.id,
                slug: chapterSlug,
            },
            include: chapterWithStoryInclude,
        });

        if (!chapter) {
            throw new NotFoundException('Chương không tồn tại');
        }

        // 1. Check if user can view unpublished chapter
        if (!chapter.isPublished) {
            const isAuthor = userId && story.authorId === userId;
            let isAllowed = isAuthor;

            if (!isAllowed && userId) {
                const user = await this.prisma.user.findUnique({ where: { id: userId } });
                if (user && user.role === UserRole.ADMIN) {
                    isAllowed = true;
                }
            }

            if (!isAllowed) {
                throw new ForbiddenException('Chương này chưa được xuất bản');
            }
        }

        // 2. Determine access by the story's accessType (spec mục 4). Instead
        //    of throwing, resolve flags so a locked chapter can still return
        //    metadata + a short teaser for the paywall UI.
        //    - FREE     : never locked (chapter.price ignored).
        //    - FREEMIUM : per-chapter (chapter.price > 0 + ChapterPurchase).
        //    - VIP      : whole story; one StoryPurchase unlocks everything.
        const isAuthor = !!userId && story.authorId === userId;
        let privileged = isAuthor;
        if (!privileged && userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (user && user.role === UserRole.ADMIN) privileged = true;
        }

        let hasAccess = true;
        let lockType: 'CHAPTER' | 'STORY' | null = null;
        let lockPrice = 0;

        if (!privileged) {
            if (story.accessType === 'VIP' && story.price > 0) {
                lockType = 'STORY';
                lockPrice = story.price;
                hasAccess = false;
                if (userId) {
                    const purchase = await this.prisma.storyPurchase.findUnique({
                        where: { userId_storyId: { userId, storyId: story.id } },
                    });
                    if (purchase) hasAccess = true;
                }
            } else if (story.accessType === 'FREEMIUM' && chapter.price > 0) {
                lockType = 'CHAPTER';
                lockPrice = chapter.price;
                hasAccess = false;
                if (userId) {
                    const purchase = await this.prisma.chapterPurchase.findUnique({
                        where: { userId_chapterId: { userId, chapterId: chapter.id } },
                    });
                    if (purchase) hasAccess = true;
                }
            }
            // FREE (or VIP/FREEMIUM with price 0) → hasAccess stays true.
        }

        // 3. Calculate word count and reading time if not set. Done on the FULL
        //    content (before any locked-stripping) so the paywall can still show
        //    accurate "X từ / Y phút đọc" stats.
        if (!chapter.wordCount || chapter.wordCount === 0) {
            const wordCount = chapter.content.split(/\s+/).length;
            const readingTime = Math.ceil(wordCount / 200); // Assume 200 words per minute

            await this.prisma.chapter.update({
                where: { id: chapter.id },
                data: { wordCount, readingTime },
            });

            chapter.wordCount = wordCount;
            chapter.readingTime = readingTime;
        }

        const isLocked = !hasAccess && lockType !== null;

        if (isLocked) {
            // Strip HTML and expose only a short teaser. Full content never
            // leaves the server for a locked chapter.
            const plain = chapter.content
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            const preview = plain.slice(0, 300);
            chapter.content = preview + (plain.length > 300 ? '…' : '');
        }

        return {
            ...chapter,
            isLocked,
            lockType,          // 'CHAPTER' | 'STORY' | null
            lockPrice,         // coin price to unlock (chapter or whole story)
            accessType: story.accessType, // frontend hides paid labels for FREEMIUM
        };
    }

    async create(storyIdOrSlug: string, userId: string, createChapterDto: CreateChapterDto) {
        // Check if storyIdOrSlug is an ID or slug
        let story = await this.prisma.story.findUnique({
            where: { id: storyIdOrSlug },
            select: { id: true, authorId: true },
        });

        if (!story) {
            // Try as slug
            story = await this.prisma.story.findUnique({
                where: { slug: storyIdOrSlug },
                select: { id: true, authorId: true },
            });
        }

        if (!story) {
            throw new NotFoundException('Truyện không tồn tại');
        }

        const storyId = story.id;

        // Check permission - chỉ author của story hoặc admin mới tạo được chapter
        if (story.authorId !== userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.role !== UserRole.ADMIN) {
                throw new ForbiddenException('Bạn chỉ có thể tạo chương cho truyện của chính mình');
            }
        }

        // Get next order number if not provided
        let order = createChapterDto.order;
        if (!order) {
            const lastChapter = await this.prisma.chapter.findFirst({
                where: { storyId },
                orderBy: { order: 'desc' },
            });
            order = lastChapter ? lastChapter.order + 1 : 1;
        }

        // Generate slug
        const baseSlug = generateSlug(createChapterDto.title);
        const slugExists = async (slug: string) => {
            const existing = await this.prisma.chapter.findFirst({
                where: { storyId, slug },
            });
            return !!existing;
        };
        const slug = await generateUniqueSlug(baseSlug, slugExists);

        await this.validateChapterPrice(createChapterDto.price);

        // Calculate word count and reading time
        const wordCount = createChapterDto.content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);

        const chapter = await this.prisma.chapter.create({
            data: {
                title: createChapterDto.title,
                slug,
                content: createChapterDto.content,
                storyId,
                order,
                uploaderId: userId,
                images: createChapterDto.images || [],
                wordCount,
                readingTime,
                price: createChapterDto.price ?? 0,
                isPublished: false,
            },
            include: chapterWithStoryInclude,
        });

        // Update story's lastChapterAt
        await this.prisma.story.update({
            where: { id: storyId },
            data: { lastChapterAt: new Date() },
        });

        return chapter;
    }

    async update(
        id: string,
        userId: string,
        userRole: UserRole,
        updateChapterDto: UpdateChapterDto
    ) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id },
            select: {
                id: true,
                storyId: true,
                story: {
                    select: {
                        id: true,
                        authorId: true,
                    },
                },
            },
        });

        if (!chapter) {
            throw new NotFoundException('Chương không tồn tại');
        }

        // Check permission - chỉ author của story hoặc admin mới edit được
        // Không ai được edit chapter của story của người khác
        if (chapter.story.authorId !== userId && userRole !== UserRole.ADMIN) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa chương này');
        }

        const updateData: any = {};

        if (updateChapterDto.title) {
            const baseSlug = generateSlug(updateChapterDto.title);
            const slugExists = async (slug: string) => {
                const existing = await this.prisma.chapter.findFirst({
                    where: { storyId: chapter.storyId, slug, id: { not: id } },
                });
                return !!existing;
            };
            updateData.title = updateChapterDto.title;
            updateData.slug = await generateUniqueSlug(baseSlug, slugExists);
        }

        if (updateChapterDto.content) {
            updateData.content = updateChapterDto.content;
            // Recalculate word count and reading time
            const wordCount = updateChapterDto.content.split(/\s+/).length;
            const readingTime = Math.ceil(wordCount / 200);
            updateData.wordCount = wordCount;
            updateData.readingTime = readingTime;
        }

        if (updateChapterDto.order !== undefined) {
            updateData.order = updateChapterDto.order;
        }

        if (updateChapterDto.images !== undefined) {
            updateData.images = updateChapterDto.images;
        }

        if (updateChapterDto.isPublished !== undefined) {
            updateData.isPublished = updateChapterDto.isPublished;
        }

        if (updateChapterDto.price !== undefined) {
            await this.validateChapterPrice(updateChapterDto.price);
            updateData.price = updateChapterDto.price;
        }

        return this.prisma.chapter.update({
            where: { id },
            data: updateData,
            include: chapterWithStoryInclude,
        });
    }

    async remove(id: string, userId: string, userRole: UserRole) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id },
            select: {
                id: true,
                story: {
                    select: {
                        id: true,
                        authorId: true,
                    },
                },
            },
        });

        if (!chapter) {
            throw new NotFoundException('Chương không tồn tại');
        }

        // Check permission - chỉ author của story hoặc admin mới xóa được
        // Không ai được xóa chapter của story của người khác
        if (chapter.story.authorId !== userId && userRole !== UserRole.ADMIN) {
            throw new ForbiddenException('Bạn không có quyền xóa chương này');
        }

        return this.prisma.chapter.delete({
            where: { id },
        });
    }

    async publish(id: string, userId: string) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
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
            throw new NotFoundException('Chương không tồn tại');
        }

        // Check permission - chỉ author của story hoặc admin mới có thể publish
        if (chapter.story.authorId !== userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.role !== UserRole.ADMIN) {
                throw new ForbiddenException('Bạn chỉ có thể xuất bản chương của chính mình');
            }
        }

        // Check if chapter is already published
        if (chapter.isPublished) {
            throw new BadRequestException('Chương này đã được xuất bản');
        }

        // Nếu story đã được publish → Cho phép tự publish chapter
        if (chapter.story.isPublished) {
            return this.prisma.chapter.update({
                where: { id },
                data: {
                    isPublished: true,
                },
                include: chapterWithStoryInclude,
            });
        }

        // Nếu story chưa publish → Chỉ admin mới có thể publish chapter
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user && user.role === UserRole.ADMIN) {
            // Admin có thể publish chapter ngay cả khi story chưa publish
            return this.prisma.chapter.update({
                where: { id },
                data: {
                    isPublished: true,
                },
                include: chapterWithStoryInclude,
            });
        }

        // Non-admin users cannot publish chapters if story is not published
        throw new BadRequestException('Truyện cần được xuất bản trước khi bạn có thể xuất bản chương. Vui lòng gửi yêu cầu phê duyệt cho truyện từ trang Dashboard.');
    }

    async unpublish(id: string, userId: string) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                isPublished: true,
                story: {
                    select: {
                        id: true,
                        authorId: true,
                    },
                },
            },
        });

        if (!chapter) {
            throw new NotFoundException('Không tìm thấy chương');
        }

        // Check permission
        if (chapter.story.authorId !== userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.role !== UserRole.ADMIN) {
                throw new ForbiddenException('Bạn không có quyền thu hồi chương này');
            }
        }

        if (!chapter.isPublished) {
            throw new BadRequestException('Chương này chưa được xuất bản');
        }

        return this.prisma.chapter.update({
            where: { id },
            data: {
                isPublished: false,
            },
            include: chapterWithStoryInclude,
        });
    }

    async incrementViewCount(storySlug: string, chapterSlug: string) {
        const story = await this.prisma.story.findUnique({
            where: { slug: storySlug },
            select: { id: true },
        });

        if (!story) {
            return;
        }

        const chapter = await this.prisma.chapter.findFirst({
            where: {
                storyId: story.id,
                slug: chapterSlug,
            },
        });

        if (chapter) {
            // Increment both chapter and story view count
            await Promise.all([
                // Increment chapter view count
                this.prisma.chapter.update({
                    where: { id: chapter.id },
                    data: {
                        viewCount: {
                            increment: 1,
                        },
                    },
                }),
                // Increment story view count
                this.prisma.story.update({
                    where: { id: story.id },
                    data: {
                        viewCount: {
                            increment: 1,
                        },
                    },
                }),
            ]);
        }
    }

    async findAllForAdmin(params?: {
        page?: number;
        limit?: number;
        search?: string;
        storyId?: string;
        isPublished?: boolean;
        sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'order' | 'title';
        sortOrder?: 'asc' | 'desc';
    }) {
        const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
            page: params?.page,
            limit: params?.limit,
        });

        const where: any = {};

        if (params?.search) {
            where.OR = [
                { title: { contains: params.search, mode: 'insensitive' } },
                { slug: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params?.storyId) {
            where.storyId = params.storyId;
        }

        if (params?.isPublished !== undefined) {
            where.isPublished = params.isPublished;
        }

        const orderBy: any = {};
        if (params?.sortBy) {
            orderBy[params.sortBy] = params.sortOrder || 'desc';
        } else {
            orderBy.createdAt = 'desc';
        }

        const [chapters, total] = await Promise.all([
            this.prisma.chapter.findMany({
                where,
                include: {
                    story: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            coverImage: true,
                        },
                    },
                    uploader: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatar: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limitNum,
            }),
            this.prisma.chapter.count({ where }),
        ]);

        return createPaginatedResult(chapters, total, pageNum, limitNum);
    }

    async getChaptersStats() {
        const [
            total,
            published,
            draft,
            totalViews,
        ] = await Promise.all([
            this.prisma.chapter.count(),
            this.prisma.chapter.count({ where: { isPublished: true } }),
            this.prisma.chapter.count({ where: { isPublished: false } }),
            this.prisma.chapter.aggregate({
                _sum: { viewCount: true },
            }),
        ]);

        return {
            total,
            published,
            draft,
            totalViews: totalViews._sum.viewCount || 0,
        };
    }

    async getChaptersChartData(days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const chapters = await this.prisma.chapter.findMany({
            where: {
                createdAt: { gte: startDate },
            },
            select: {
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Group by date
        const grouped: { [key: string]: number } = {};
        chapters.forEach((chapter) => {
            const date = new Date(chapter.createdAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            grouped[date] = (grouped[date] || 0) + 1;
        });

        const labels = Object.keys(grouped).sort();
        const data = labels.map((label) => grouped[label]);

        return {
            labels,
            data,
        };
    }

    async buyChapter(userId: string, chapterId: string) {
        const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            select: {
                id: true,
                title: true,
                price: true,
                story: { select: { authorId: true } },
            },
        });

        if (!chapter) {
            throw new NotFoundException('Chương không tồn tại');
        }

        if (chapter.price <= 0) {
            return { success: true, message: 'Chương này miễn phí' };
        }

        // The author already has free access to their own chapters, so buying
        // makes no sense and would self-credit. Block it explicitly.
        if (chapter.story.authorId === userId) {
            return { success: true, message: 'Bạn là tác giả, chương này đã mở' };
        }

        // Atomic: balance check, deduct buyer, credit author (net), keep fee,
        // write both transactions + the purchase record. Idempotent on re-buy.
        const result = await this.walletService.payForChapter(
            userId,
            chapter.story.authorId,
            { id: chapter.id, title: chapter.title, price: chapter.price },
        );

        return {
            success: true,
            message: result.alreadyOwned
                ? 'Bạn đã mua chương này rồi'
                : 'Mua chương thành công',
            newBalance: result.newBalance,
            alreadyOwned: result.alreadyOwned,
        };
    }
}

