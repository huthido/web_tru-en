import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { ApprovalType, ApprovalStatus, UserRole, StoryStatus } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ApprovalsService {
    private readonly logger = new Logger(ApprovalsService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
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

        if (chapterId) {
            const chapter = await this.prisma.chapter.findUnique({
                where: { id: chapterId },
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
            if (chapter.story.authorId !== userId) {
                throw new ForbiddenException('Bạn chỉ có thể yêu cầu publish chương của chính mình');
            }
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

        return this.prisma.approvalRequest.create({
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

        return createPaginatedResult(requests, total, pageNum, limitNum);
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
                chapter: true,
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
        if (reviewDto.status === ApprovalStatus.APPROVED) {
            if (request.type === ApprovalType.STORY_PUBLISH && request.storyId) {
                const currentStory = await this.prisma.story.findUnique({
                    where: { id: request.storyId },
                    select: { status: true },
                });

                // Nếu story đang DRAFT thì chuyển sang ONGOING
                // Nếu đã có status khác (COMPLETED, ONGOING) thì giữ nguyên
                const newStatus = currentStory?.status === StoryStatus.DRAFT
                    ? StoryStatus.ONGOING
                    : currentStory?.status;

                await this.prisma.story.update({
                    where: { id: request.storyId },
                    data: {
                        isPublished: true,
                        status: newStatus,
                    },
                });
            } else if (request.type === ApprovalType.CHAPTER_PUBLISH && request.chapterId) {
                await this.prisma.chapter.update({
                    where: { id: request.chapterId },
                    data: {
                        isPublished: true,
                    },
                });
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

        return updatedRequest;
    }
}

