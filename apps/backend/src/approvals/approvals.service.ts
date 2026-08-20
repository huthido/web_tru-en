import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
    Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { ApprovalType, ApprovalStatus, UserRole, StoryStatus, NotificationType } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';
import { TtsService } from '../tts/tts.service';

/**
 * Tác giả có từng này truyện được admin duyệt TAY thì thành "tác giả tin cậy":
 * truyện mới gửi duyệt sẽ được tự động duyệt ngay (hybrid — giảm tải admin mà
 * vẫn tiền kiểm tác giả mới, giữ an toàn AdSense/app store).
 */
const TRUSTED_AUTHOR_MIN_APPROVED = parseInt(
    process.env.TRUSTED_AUTHOR_MIN_APPROVED ?? '2',
    10,
);

@Injectable()
export class ApprovalsService {
    private readonly logger = new Logger(ApprovalsService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private notificationsService: NotificationsService,
        // Optional: thiếu TtsModule thì duyệt truyện vẫn chạy bình thường.
        @Optional() private ttsService?: TtsService,
    ) { }

    async createRequest(
        userId: string,
        storyId: string | null,
        chapterId: string | null,
        createDto: CreateApprovalRequestDto
    ) {
        // Validate that user owns the story/chapter
        if (storyId) {
            const story = await this.prisma.story.findUnique({
                where: { id: storyId },
                select: {
                    id: true,
                    authorId: true,
                    coverImage: true,
                    chapters: {
                        select: { id: true },
                    },
                },
            });
            if (!story) {
                throw new NotFoundException('Truyện không tồn tại');
            }
            if (story.authorId !== userId) {
                throw new ForbiddenException('Bạn chỉ có thể yêu cầu publish truyện của chính mình');
            }

            // Check if story has at least 1 chapter
            if (!story.chapters || story.chapters.length === 0) {
                throw new BadRequestException('Truyện phải có ít nhất 1 chương trước khi gửi yêu cầu xuất bản');
            }
        }

        // Chương KHÔNG cần duyệt riêng (mô hình từ 10/08/2026): truyện được
        // duyệt thì mọi chương nháp tự đăng theo; truyện đã publish thì tác
        // giả tự đăng chương. Chặn tạo request mới; request cũ vẫn review được.
        if (chapterId) {
            throw new BadRequestException(
                'Chương không cần duyệt riêng — chương sẽ tự được đăng khi truyện được duyệt, hoặc bạn tự xuất bản khi truyện đã đăng.'
            );
        }

        // Check if there's already a pending request
        const existingRequest = await this.prisma.approvalRequest.findFirst({
            where: {
                userId,
                storyId: storyId || undefined,
                chapterId: chapterId || undefined,
                status: ApprovalStatus.PENDING,
            },
        });

        if (existingRequest) {
            throw new BadRequestException('Bạn đã có yêu cầu phê duyệt đang chờ xử lý');
        }

        const created = await this.prisma.approvalRequest.create({
            data: {
                userId,
                storyId,
                chapterId,
                type: createDto.type,
                message: createDto.message,
                status: ApprovalStatus.PENDING,
            },
            include: {
                story: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        coverImage: true,
                    },
                },
                chapter: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        // Hybrid: tác giả tin cậy → truyện được tự động duyệt ngay, không chờ
        // admin. Client không cần đổi gì — đọc status APPROVED trong response.
        if (
            createDto.type === ApprovalType.STORY_PUBLISH &&
            storyId &&
            (await this.isTrustedAuthor(userId))
        ) {
            return this.autoApproveStoryRequest(created.id, storyId);
        }

        return created;
    }

    /**
     * Tác giả tin cậy = có ≥ TRUSTED_AUTHOR_MIN_APPROVED truyện (DISTINCT)
     * từng được admin duyệt TAY. Request tự động duyệt có reviewedBy = null
     * nên không được đếm — trust không tự nhân từ auto-approve.
     */
    private async isTrustedAuthor(userId: string): Promise<boolean> {
        const approvedStories = await this.prisma.approvalRequest.findMany({
            where: {
                userId,
                type: ApprovalType.STORY_PUBLISH,
                status: ApprovalStatus.APPROVED,
                reviewedBy: { not: null },
                storyId: { not: null },
            },
            select: { storyId: true },
            distinct: ['storyId'],
        });
        return approvedStories.length >= TRUSTED_AUTHOR_MIN_APPROVED;
    }

    /**
     * Duyệt ngay request truyện của tác giả tin cậy: cập nhật request
     * (reviewedBy = null để phân biệt với duyệt tay), publish truyện + cascade
     * chương chờ, gửi email + notification y như duyệt tay.
     */
    private async autoApproveStoryRequest(requestId: string, storyId: string) {
        const adminNote = `Tự động duyệt — tác giả tin cậy (đã có ${TRUSTED_AUTHOR_MIN_APPROVED}+ truyện được duyệt)`;
        const updatedRequest = await this.prisma.approvalRequest.update({
            where: { id: requestId },
            data: {
                status: ApprovalStatus.APPROVED,
                adminNote,
                reviewedBy: null,
                reviewedAt: new Date(),
            },
            include: {
                story: true,
                chapter: {
                    include: {
                        story: { select: { slug: true, title: true } },
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        const autoApprovedChapters = await this.publishApprovedStory(storyId, null);

        try {
            const user = updatedRequest.user;
            if (user && updatedRequest.story) {
                await this.emailService.sendApprovalApprovedEmail(
                    user.email,
                    user.displayName || user.username,
                    updatedRequest.story.title,
                    updatedRequest.story.slug,
                    adminNote,
                );
            }
        } catch (error) {
            this.logger.error('Failed to send auto-approval email:', error);
        }

        this.sendApprovalInAppNotification(updatedRequest, {
            status: ApprovalStatus.APPROVED,
            adminNote,
        } as ReviewApprovalDto).catch((e) =>
            this.logger.warn(`Notify auto-approval failed: ${e?.message ?? e}`),
        );

        this.logger.log(
            `Auto-approved story request ${requestId} (trusted author ${updatedRequest.userId})`,
        );
        return { ...updatedRequest, autoApprovedChapters };
    }

    async findAll(
        page?: number,
        limit?: number,
        status?: ApprovalStatus,
        type?: ApprovalType,
        search?: string
    ) {
        const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
            page,
            limit,
        });

        const where: any = {};
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        if (search) {
            where.OR = [
                {
                    story: {
                        title: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    chapter: {
                        title: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    user: {
                        OR: [
                            {
                                username: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                            {
                                displayName: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        ],
                    },
                },
                {
                    message: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const total = await this.prisma.approvalRequest.count({ where });

        const requests = await this.prisma.approvalRequest.findMany({
            where,
            include: {
                story: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        coverImage: true,
                        // Cho admin biết truyện đã có chương công khai chưa —
                        // chưa có thì PUBLIC_STORY_WHERE sẽ giấu truyện khỏi
                        // trang chủ dù đã duyệt.
                        _count: {
                            select: {
                                chapters: { where: { isPublished: true } },
                            },
                        },
                    },
                },
                chapter: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });

        // Đếm số chương đang chờ duyệt của các truyện trong trang — badge admin
        // dùng để báo "duyệt truyện sẽ tự đăng N chương".
        const storyIds = [
            ...new Set(
                requests
                    .filter((r) => r.type === ApprovalType.STORY_PUBLISH && r.storyId)
                    .map((r) => r.storyId as string),
            ),
        ];
        // Đếm chương nháp (không hẹn giờ) — badge admin báo "duyệt truyện sẽ
        // tự đăng N chương". Chương hẹn giờ không tính vì giữ lịch riêng.
        const draftByStory = new Map<string, number>();
        if (storyIds.length > 0) {
            const draftCounts = await this.prisma.chapter.groupBy({
                by: ['storyId'],
                where: {
                    storyId: { in: storyIds },
                    isPublished: false,
                    scheduledPublishAt: null,
                },
                _count: { _all: true },
            });
            for (const g of draftCounts) {
                draftByStory.set(g.storyId, g._count._all);
            }
        }

        const enriched = requests.map((r) => {
            const { _count, ...storyRest } = (r.story ?? {}) as any;
            return {
                ...r,
                story: r.story
                    ? { ...storyRest, publishedChapterCount: _count?.chapters ?? 0 }
                    : r.story,
                draftChapterCount: r.storyId
                    ? draftByStory.get(r.storyId) ?? 0
                    : 0,
            };
        });

        return createPaginatedResult(enriched, total, pageNum, limitNum);
    }

    async findMyRequests(userId: string, page?: number, limit?: number) {
        const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
            page,
            limit,
        });

        const where = { userId };

        const total = await this.prisma.approvalRequest.count({ where });

        const requests = await this.prisma.approvalRequest.findMany({
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
                chapter: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });

        return createPaginatedResult(requests, total, pageNum, limitNum);
    }

    async review(
        requestId: string,
        adminId: string,
        reviewDto: ReviewApprovalDto
    ) {
        const request = await this.prisma.approvalRequest.findUnique({
            where: { id: requestId },
            include: {
                story: true,
                chapter: true,
            },
        });

        if (!request) {
            throw new NotFoundException('Yêu cầu phê duyệt không tồn tại');
        }

        if (request.status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('Yêu cầu này đã được xử lý');
        }

        // Update request
        const updatedRequest = await this.prisma.approvalRequest.update({
            where: { id: requestId },
            data: {
                status: reviewDto.status,
                adminNote: reviewDto.adminNote,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
            include: {
                story: true,
                chapter: {
                    include: {
                        story: { select: { slug: true, title: true } },
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        // If approved, publish the story/chapter
        let autoApprovedChapters = 0;
        if (reviewDto.status === ApprovalStatus.APPROVED) {
            if (request.type === ApprovalType.STORY_PUBLISH && request.storyId) {
                autoApprovedChapters = await this.publishApprovedStory(
                    request.storyId,
                    adminId,
                );
            } else if (request.type === ApprovalType.CHAPTER_PUBLISH && request.chapterId) {
                const publishedChapter = await this.prisma.chapter.update({
                    where: { id: request.chapterId },
                    data: {
                        isPublished: true,
                    },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        story: {
                            select: { id: true, title: true, slug: true },
                        },
                    },
                });
                // Fanout tới follower của truyện (best-effort).
                void this.notificationsService.fanoutChapterPublished(publishedChapter);
            }
        }

        // Send email notification to user
        try {
            const user = updatedRequest.user;
            if (user && updatedRequest.story) {
                if (reviewDto.status === ApprovalStatus.APPROVED) {
                    await this.emailService.sendApprovalApprovedEmail(
                        user.email,
                        user.displayName || user.username,
                        updatedRequest.story.title,
                        updatedRequest.story.slug,
                        reviewDto.adminNote
                    );
                } else if (reviewDto.status === ApprovalStatus.REJECTED) {
                    await this.emailService.sendApprovalRejectedEmail(
                        user.email,
                        user.displayName || user.username,
                        updatedRequest.story.title,
                        reviewDto.adminNote
                    );
                }
            }
        } catch (error) {
            // Don't fail the approval if email fails
            this.logger.error('Failed to send approval notification email:', error);
        }

        // In-app + push notification (best-effort, không vỡ flow nếu fail).
        this.sendApprovalInAppNotification(updatedRequest, reviewDto).catch((e) =>
            this.logger.warn(`Notify approval failed: ${e?.message ?? e}`),
        );

        return { ...updatedRequest, autoApprovedChapters };
    }

    /**
     * Phần "publish truyện" dùng chung cho duyệt tay (review) và tự động duyệt
     * (tác giả tin cậy): bật isPublished, DRAFT→ONGOING (status khác giữ
     * nguyên), rồi đăng toàn bộ chương nháp không hẹn giờ. Trả về số chương
     * đã đăng kèm. adminId = null khi tự động duyệt.
     */
    private async publishApprovedStory(
        storyId: string,
        adminId: string | null,
    ): Promise<number> {
        const currentStory = await this.prisma.story.findUnique({
            where: { id: storyId },
            select: { status: true, publishedAt: true },
        });

        const newStatus = currentStory?.status === StoryStatus.DRAFT
            ? StoryStatus.ONGOING
            : currentStory?.status;

        await this.prisma.story.update({
            where: { id: storyId },
            data: {
                isPublished: true,
                status: newStatus,
                // Ngày duyệt lần đầu — sort "Mới nhất"; duyệt lại không ghi đè.
                publishedAt: currentStory?.publishedAt ?? new Date(),
            },
        });

        return this.publishStoryChapters(storyId, adminId);
    }

    /**
     * Duyệt truyện = duyệt luôn nội dung của nó: MỌI chương nháp được đăng
     * theo, không cần duyệt riêng từng chương. Nếu không, truyện được duyệt
     * nhưng 0 chương công khai sẽ bị PUBLIC_STORY_WHERE (bộ lọc AdSense
     * 04/08/2026) giấu khỏi trang chủ — admin tưởng duyệt xong mà không thấy.
     *
     * Ngoại lệ: chương ĐÃ HẸN GIỜ (scheduledPublishAt) giữ nguyên lịch, cron
     * đăng khi tới hạn — không phá luồng ra chương nhỏ giọt. Request duyệt
     * chương còn treo (di sản luồng cũ) được đóng APPROVED cho sạch queue —
     * lần theo chapter.storyId vì request chương có storyId = null.
     * Không fanout thông báo từng chương — truyện vừa ra mắt chưa có follower.
     */
    private async publishStoryChapters(
        storyId: string,
        adminId: string | null,
    ): Promise<number> {
        const [, published] = await this.prisma.$transaction([
            this.prisma.approvalRequest.updateMany({
                where: {
                    type: ApprovalType.CHAPTER_PUBLISH,
                    status: ApprovalStatus.PENDING,
                    chapter: { storyId },
                },
                data: {
                    status: ApprovalStatus.APPROVED,
                    adminNote: 'Tự động duyệt khi truyện được duyệt',
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                },
            }),
            this.prisma.chapter.updateMany({
                where: { storyId, isPublished: false, scheduledPublishAt: null },
                data: { isPublished: true },
            }),
        ]);

        if (published.count > 0) {
            this.logger.log(
                `Auto-published ${published.count} chapter(s) of approved story ${storyId}`,
            );
            // Tự sinh audio AI nền cho toàn bộ chương vừa đăng kèm truyện.
            this.ttsService?.autoGenerateForStory(storyId);
        }
        return published.count;
    }

    /**
     * Bell + push cho author khi yêu cầu được duyệt/từ chối.
     *
     * - APPROVED story → click vào `/story/<slug>` (trang công khai).
     * - REJECTED story → click vào `/tac-gia/truyen/<slug>` (trang sửa).
     * - APPROVED/REJECTED chapter → trỏ thẳng chapter reader hoặc edit page.
     *
     * Tách helper để giữ `review()` đọc dễ; gọi best-effort ngoài transaction.
     */
    private async sendApprovalInAppNotification(
        updatedRequest: any,
        reviewDto: ReviewApprovalDto,
    ) {
        const authorId = updatedRequest.userId;
        if (!authorId) return;

        const isApproved = reviewDto.status === ApprovalStatus.APPROVED;
        const isStory = updatedRequest.type === ApprovalType.STORY_PUBLISH;
        const story = updatedRequest.story;
        const chapter = updatedRequest.chapter;

        let title: string;
        let content: string;
        let actionUrl: string | undefined;
        let type: NotificationType;

        if (isStory && story) {
            if (isApproved) {
                title = 'Truyện đã được duyệt ✅';
                content = `"${story.title}" của bạn đã được duyệt và xuất bản.`;
                actionUrl = `/story/${story.slug}`;
                type = NotificationType.STORY_APPROVED;
            } else {
                title = 'Truyện bị từ chối';
                content = `"${story.title}" bị từ chối${reviewDto.adminNote ? `: ${reviewDto.adminNote}` : '.'}`;
                actionUrl = `/tac-gia/truyen/${story.slug}`;
                type = NotificationType.STORY_REJECTED;
            }
        } else if (chapter) {
            const storySlug = chapter.story?.slug;
            const storyTitle = chapter.story?.title ?? 'Truyện';
            if (isApproved) {
                title = 'Chương đã được duyệt ✅';
                content = `Chương "${chapter.title}" của "${storyTitle}" đã được duyệt.`;
                actionUrl = storySlug ? `/story/${storySlug}/chapter/${chapter.slug}` : undefined;
                type = NotificationType.STORY_APPROVED;
            } else {
                title = 'Chương bị từ chối';
                content = `Chương "${chapter.title}" bị từ chối${reviewDto.adminNote ? `: ${reviewDto.adminNote}` : '.'}`;
                actionUrl = storySlug ? `/tac-gia/truyen/${storySlug}` : undefined;
                type = NotificationType.STORY_REJECTED;
            }
        } else {
            return;
        }

        await this.notificationsService.notifyUser(authorId, {
            title,
            content,
            type,
            actionUrl,
        });
    }
}

