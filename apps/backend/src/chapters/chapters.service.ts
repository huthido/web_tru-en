import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { generateSlug, generateUniqueSlug } from '../common/utils/slug.util';
import { chapterWithStoryInclude } from '../prisma/prisma.helpers';
import { UserRole, ApprovalType, ApprovalStatus } from '@prisma/client';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

import { WalletService } from '../wallet/wallet.service';
import { MonetizationService } from '../monetization/monetization.service';
import { TtsService } from '../tts/tts.service';

@Injectable()
export class ChaptersService {
    constructor(
        private prisma: PrismaService,
        private approvalsService: ApprovalsService,
        private walletService: WalletService,
        private notificationsService: NotificationsService,
        private monetization: MonetizationService,
        // Optional: thiếu TtsModule (test cũ) thì publish vẫn chạy bình thường.
        @Optional() private ttsService?: TtsService,
    ) { }

    /**
     * Gate "tạo paid chapter" — chỉ tác giả đủ điều kiện monetization mới
     * được đặt `price > 0`. Free chapter không bị ảnh hưởng.
     */
    private async assertCanSetPaidChapter(authorId: string, price?: number) {
        if ((price ?? 0) <= 0) return;
        await this.monetization.assertEligibleForAdvancedFeatures(authorId);
    }

    /**
     * Reject a paid price so small that the platform fee would leave the
     * author with 0 net coins. 0 (free) is always allowed. Uses the live fee %.
     */
    private async validateChapterPrice(price?: number) {
        if (price === undefined || price <= 0) return;
        const feePercent = await this.walletService.getChapterSaleFeePercent();
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
            select: { id: true, authorId: true, isPublished: true, accessType: true, price: true, maturity: true },
        });

        if (!story) {
            throw new NotFoundException('Truyện không tồn tại');
        }

        // Nội dung MATURE (Families Policy): chỉ chủ truyện/admin hoặc user đã bật
        // xem nội dung người lớn mới được đọc. Trả 404 để không lộ sự tồn tại.
        if (story.maturity === 'MATURE') {
            const isMatureAuthor = !!userId && story.authorId === userId;
            let matureAllowed = isMatureAuthor;
            if (!matureAllowed && userId) {
                const u = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { role: true, allowAdultContent: true },
                });
                matureAllowed = !!u && (u.role === UserRole.ADMIN || u.allowAdultContent === true);
            }
            if (!matureAllowed) {
                throw new NotFoundException('Chương không tồn tại');
            }
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
            // Audio cũng là nội dung trả phí — không lộ URL khi chưa mở khoá.
            chapter.audioUrl = null;
            chapter.ttsAudioUrl = null;
            chapter.ttsAudioStatus = null;
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
        await this.assertCanSetPaidChapter(userId, createChapterDto.price);

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
                audioUrl: createChapterDto.audioUrl || null,
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

        if (updateChapterDto.audioUrl !== undefined) {
            updateData.audioUrl = updateChapterDto.audioUrl || null;
        }

        if (updateChapterDto.isPublished !== undefined) {
            // Chặn bypass kiểm duyệt: tác giả sửa isPublished qua PATCH sẽ né
            // được cả điều kiện "truyện phải publish trước" của publish().
            // Mọi UI hợp lệ đều dùng POST .../publish|unpublish.
            if (userRole !== UserRole.ADMIN) {
                throw new ForbiddenException(
                    'Chỉ admin mới đổi được trạng thái xuất bản qua chỉnh sửa. Vui lòng dùng chức năng xuất bản/ẩn chương.'
                );
            }
            updateData.isPublished = updateChapterDto.isPublished;
        }

        if (updateChapterDto.price !== undefined) {
            await this.validateChapterPrice(updateChapterDto.price);
            // Chỉ check eligibility khi SET price>0 (bỏ giá → free thì OK).
            if ((updateChapterDto.price ?? 0) > 0) {
                await this.assertCanSetPaidChapter(chapter.story.authorId, updateChapterDto.price);
            }
            updateData.price = updateChapterDto.price;
        }

        const updated = await this.prisma.chapter.update({
            where: { id },
            data: updateData,
            include: chapterWithStoryInclude,
        });
        // Admin bật isPublished qua PATCH → cũng tự sinh audio AI như publish().
        if (updateData.isPublished === true) {
            this.ttsService?.autoGenerateForChapter(id);
        }
        return updated;
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
                slug: true,
                isPublished: true,
                story: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
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

        const doPublish = async () => {
            const updated = await this.prisma.chapter.update({
                where: { id },
                data: {
                    isPublished: true,
                },
                include: chapterWithStoryInclude,
            });
            // Fanout tới mọi follower (best-effort, fire-and-forget).
            void this.notificationsService.fanoutChapterPublished({
                id: chapter.id,
                title: chapter.title,
                slug: chapter.slug,
                story: {
                    id: chapter.story.id,
                    title: chapter.story.title,
                    slug: chapter.story.slug,
                },
            });
            // Tự sinh audio AI nền — độc giả vào là có sẵn, không phải đợi.
            this.ttsService?.autoGenerateForChapter(chapter.id);
            return updated;
        };

        // Nếu story đã được publish → Cho phép tự publish chapter
        if (chapter.story.isPublished) {
            return doPublish();
        }

        // Nếu story chưa publish → Chỉ admin mới có thể publish chapter
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user && user.role === UserRole.ADMIN) {
            // Admin có thể publish chapter ngay cả khi story chưa publish
            return doPublish();
        }

        // Non-admin users cannot publish chapters if story is not published
        throw new BadRequestException('Truyện chưa được duyệt. Chương sẽ tự động được đăng khi truyện được duyệt — hãy gửi yêu cầu phê duyệt truyện từ trang Dashboard.');
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

    // ===== Lịch tự xuất bản (drip release) =====

    /**
     * Rải đều lịch xuất bản cho các chương NHÁP của một truyện đã publish.
     * Chương được sắp theo `order`; mỗi `perBatch` chương dùng chung một mốc
     * giờ, các đợt cách nhau `intervalHours`. Chỉ tác giả truyện (hoặc admin)
     * thao tác được, và truyện phải đã publish (hướng a).
     */
    async scheduleDraftChapters(
        storySlug: string,
        userId: string,
        userRole: UserRole,
        opts: { startAt: string; intervalHours?: number; perBatch?: number; reset?: boolean },
    ) {
        const story = await this.prisma.story.findFirst({
            where: { OR: [{ slug: storySlug }, { id: storySlug }] },
            select: { id: true, authorId: true, isPublished: true },
        });
        if (!story) throw new NotFoundException('Truyện không tồn tại');
        if (story.authorId !== userId && userRole !== UserRole.ADMIN) {
            throw new ForbiddenException('Bạn chỉ có thể đặt lịch cho truyện của mình');
        }
        if (!story.isPublished) {
            throw new BadRequestException(
                'Truyện cần được xuất bản (đã duyệt) trước khi đặt lịch ra chương.',
            );
        }

        const start = new Date(opts.startAt);
        if (isNaN(start.getTime())) throw new BadRequestException('startAt không hợp lệ');
        const intervalHours = opts.intervalHours ?? 24;
        const perBatch = opts.perBatch ?? 1;

        // Chương nháp, theo thứ tự đăng. reset=false thì bỏ qua chương đã có lịch.
        const drafts = await this.prisma.chapter.findMany({
            where: {
                storyId: story.id,
                isPublished: false,
                ...(opts.reset ? {} : { scheduledPublishAt: null }),
            },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, order: true },
        });

        if (drafts.length === 0) {
            return { scheduled: [], message: 'Không có chương nháp nào để đặt lịch.' };
        }

        const intervalMs = intervalHours * 60 * 60 * 1000;
        const scheduled = await this.prisma.$transaction(
            drafts.map((ch, i) => {
                const when = new Date(start.getTime() + Math.floor(i / perBatch) * intervalMs);
                return this.prisma.chapter.update({
                    where: { id: ch.id },
                    data: { scheduledPublishAt: when },
                    select: { id: true, title: true, order: true, scheduledPublishAt: true },
                });
            }),
        );

        return {
            scheduled,
            count: scheduled.length,
            message: `Đã đặt lịch ${scheduled.length} chương, ${perBatch} chương mỗi ${intervalHours}h.`,
        };
    }

    /**
     * Xuất bản NGAY mọi chương nháp của truyện (tác giả/admin). Truyện chưa
     * duyệt thì chỉ admin làm được (chương sẽ tự đăng khi truyện được duyệt).
     * Fanout thông báo 1 lần cho chương mới nhất (tránh spam follower N lần);
     * audio AI sinh nền cho cả truyện.
     */
    async publishAllDrafts(storySlug: string, userId: string, userRole: UserRole) {
        const story = await this.prisma.story.findFirst({
            where: { OR: [{ slug: storySlug }, { id: storySlug }] },
            select: { id: true, title: true, slug: true, authorId: true, isPublished: true },
        });
        if (!story) throw new NotFoundException('Truyện không tồn tại');
        const isAdmin = userRole === UserRole.ADMIN;
        if (story.authorId !== userId && !isAdmin) {
            throw new ForbiddenException('Bạn chỉ có thể xuất bản chương của truyện mình');
        }
        if (!story.isPublished && !isAdmin) {
            throw new BadRequestException(
                'Truyện chưa được duyệt. Chương sẽ tự động được đăng khi truyện được duyệt — hãy gửi yêu cầu phê duyệt truyện từ trang Dashboard.',
            );
        }

        const drafts = await this.prisma.chapter.findMany({
            where: { storyId: story.id, isPublished: false },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, slug: true, order: true },
        });
        if (drafts.length === 0) {
            return { published: 0, message: 'Không có chương nháp nào để xuất bản.' };
        }

        const result = await this.prisma.chapter.updateMany({
            where: { id: { in: drafts.map((d) => d.id) }, isPublished: false },
            data: { isPublished: true, scheduledPublishAt: null },
        });

        const latest = drafts[drafts.length - 1];
        void this.notificationsService.fanoutChapterPublished({
            id: latest.id,
            title: latest.title,
            slug: latest.slug,
            story: { id: story.id, title: story.title, slug: story.slug },
        });
        this.ttsService?.autoGenerateForStory(story.id);

        return {
            published: result.count,
            message: `Đã xuất bản ${result.count} chương.`,
        };
    }

    /**
     * Cron gọi mỗi phút: tìm chương tới hạn (scheduledPublishAt <= now,
     * chưa publish, truyện đã publish) và xuất bản + fanout thông báo.
     * Trả về số chương đã đăng.
     */
    async publishDueScheduled(now: Date = new Date()): Promise<number> {
        const due = await this.prisma.chapter.findMany({
            where: {
                isPublished: false,
                scheduledPublishAt: { not: null, lte: now },
                story: { isPublished: true },
            },
            orderBy: { scheduledPublishAt: 'asc' },
            take: 50, // an toàn: tối đa 50 chương/phút
            select: {
                id: true,
                title: true,
                slug: true,
                story: { select: { id: true, title: true, slug: true } },
            },
        });

        let published = 0;
        for (const ch of due) {
            try {
                await this.prisma.chapter.update({
                    where: { id: ch.id },
                    data: { isPublished: true },
                });
                void this.notificationsService.fanoutChapterPublished({
                    id: ch.id,
                    title: ch.title,
                    slug: ch.slug,
                    story: { id: ch.story.id, title: ch.story.title, slug: ch.story.slug },
                });
                // Chương hẹn giờ vừa đăng → tự sinh audio AI nền.
                this.ttsService?.autoGenerateForChapter(ch.id);
                published++;
            } catch {
                // Lỗi 1 chương không chặn các chương còn lại; cron sau thử lại.
            }
        }
        return published;
    }
}

