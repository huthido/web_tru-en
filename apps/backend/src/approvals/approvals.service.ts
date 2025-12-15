import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { ApprovalType, ApprovalStatus, UserRole, StoryStatus } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ApprovalsService {
    constructor(private prisma: PrismaService) { }

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
            });
            if (!story) {
                throw new NotFoundException('Truyện không tồn tại');
            }
            if (story.authorId !== userId) {
                throw new ForbiddenException('Bạn chỉ có thể yêu cầu publish truyện của chính mình');
            }
        }

        if (chapterId) {
            const chapter = await this.prisma.chapter.findUnique({
                where: { id: chapterId },
                include: { story: true },
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

    async findAll(page?: number, limit?: number, status?: ApprovalStatus) {
        const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
            page,
            limit,
        });

        const where: any = {};
        if (status) {
            where.status = status;
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
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        // If approved, publish the story/chapter
        if (reviewDto.status === ApprovalStatus.APPROVED) {
            if (request.type === ApprovalType.STORY_PUBLISH && request.storyId) {
                await this.prisma.story.update({
                    where: { id: request.storyId },
                    data: {
                        isPublished: true,
                        status: StoryStatus.PUBLISHED,
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

        return updatedRequest;
    }
}

