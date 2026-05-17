import { Injectable, NotFoundException, ForbiddenException, MessageEvent } from '@nestjs/common';
import { Subject, Observable, merge, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
    // In-process pub/sub for SSE. Fine for a single instance; for multi-instance
    // deploys this would need Redis pub/sub, but the app runs one backend.
    private readonly events$ = new Subject<{ userId: string }>();

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) {}

    /**
     * Create a personal notification for ONE user (auto events like
     * donate/sale). No email, no role broadcast. Emits an SSE tick so the
     * recipient's bell updates live. Best-effort — callers should not let a
     * failure here break their own transaction.
     */
    async notifyUser(
        userId: string,
        data: { title: string; content: string; type?: NotificationType; priority?: NotificationPriority },
    ) {
        const notification = await this.prisma.notification.create({
            data: {
                title: data.title,
                content: data.content,
                type: data.type || NotificationType.INFO,
                priority: data.priority || NotificationPriority.NORMAL,
                targetRole: null,
                sendEmail: false,
                // createdById omitted — system/auto notification, no creator.
            },
        });
        await this.prisma.notificationRecipient.create({
            data: { notificationId: notification.id, userId },
        });
        this.events$.next({ userId });
        return notification;
    }

    /**
     * SSE stream for a single user. Emits a small payload whenever a new
     * notification targets them, plus a periodic heartbeat to keep the
     * connection (and any proxy) alive.
     */
    streamFor(userId: string): Observable<MessageEvent> {
        const ticks$ = this.events$.pipe(
            filter((e) => e.userId === userId),
            map(() => ({ data: { type: 'notification' } }) as MessageEvent),
        );
        const heartbeat$ = interval(25000).pipe(
            map(() => ({ data: { type: 'ping' } }) as MessageEvent),
        );
        return merge(ticks$, heartbeat$);
    }

    async create(userId: string, dto: CreateNotificationDto) {
        // Create notification
        const notification = await this.prisma.notification.create({
            data: {
                title: dto.title,
                content: dto.content,
                type: dto.type,
                priority: dto.priority || 'NORMAL',
                targetRole: dto.targetRole || null,
                sendEmail: dto.sendEmail || false,
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

        // Get target users
        const whereClause: any = { isActive: true, emailVerified: true };
        if (dto.targetRole) {
            whereClause.role = dto.targetRole;
        }

        const targetUsers = await this.prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                displayName: true,
                username: true,
            },
        });

        // Create notification recipients
        if (targetUsers.length > 0) {
            await this.prisma.notificationRecipient.createMany({
                data: targetUsers.map(user => ({
                    notificationId: notification.id,
                    userId: user.id,
                })),
            });

            // Send emails if requested
            if (dto.sendEmail) {
                await this.sendNotificationEmails(notification, targetUsers);
            }
        }

        return {
            ...notification,
            recipientCount: targetUsers.length,
        };
    }

    private async sendNotificationEmails(notification: any, users: any[]) {
        const emailPromises = users.map(user =>
            this.emailService.sendSystemNotification(
                user.email,
                user.displayName || user.username,
                notification.title,
                notification.content,
                notification.type,
                notification.priority,
            ).catch(err => {
                console.error(`Failed to send email to ${user.email}:`, err);
            })
        );

        await Promise.allSettled(emailPromises);
    }

    async findAll(params?: {
        page?: number;
        limit?: number;
        type?: string;
        priority?: string;
        isActive?: boolean;
    }) {
        const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
            page: params?.page,
            limit: params?.limit,
        });

        const where: any = {};
        if (params?.type) where.type = params.type;
        if (params?.priority) where.priority = params.priority;
        if (params?.isActive !== undefined) where.isActive = params.isActive;

        const [notifications, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                        },
                    },
                    _count: {
                        select: {
                            recipients: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            this.prisma.notification.count({ where }),
        ]);

        return createPaginatedResult(notifications, total, pageNum, limitNum);
    }

    async findOne(id: string) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
                _count: {
                    select: {
                        recipients: true,
                    },
                },
            },
        });

        if (!notification) {
            throw new NotFoundException('Không tìm thấy thông báo');
        }

        return notification;
    }

    async update(id: string, dto: UpdateNotificationDto) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            throw new NotFoundException('Không tìm thấy thông báo');
        }

        return this.prisma.notification.update({
            where: { id },
            data: dto,
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
    }

    async remove(id: string) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            throw new NotFoundException('Không tìm thấy thông báo');
        }

        return this.prisma.notification.delete({
            where: { id },
        });
    }

    // User endpoints
    async getUserNotifications(userId: string, params?: {
        page?: number;
        limit?: number;
        isRead?: boolean;
    }) {
        const { page: pageNum, limit: limitNum, skip } = getPaginationParams({
            page: params?.page,
            limit: params?.limit || 20,
        });

        const where: any = { userId };
        if (params?.isRead !== undefined) {
            where.isRead = params.isRead;
        }

        const [recipients, total] = await Promise.all([
            this.prisma.notificationRecipient.findMany({
                where,
                include: {
                    notification: {
                        include: {
                            createdBy: {
                                select: {
                                    id: true,
                                    username: true,
                                    displayName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            this.prisma.notificationRecipient.count({ where }),
        ]);

        const notifications = recipients.map(r => ({
            ...r.notification,
            recipientId: r.id,
            isRead: r.isRead,
            readAt: r.readAt,
        }));

        return createPaginatedResult(notifications, total, pageNum, limitNum);
    }

    async getUnreadCount(userId: string) {
        const count = await this.prisma.notificationRecipient.count({
            where: {
                userId,
                isRead: false,
            },
        });

        return { count };
    }

    async markAsRead(userId: string, recipientId: string) {
        const recipient = await this.prisma.notificationRecipient.findUnique({
            where: { id: recipientId },
        });

        if (!recipient) {
            throw new NotFoundException('Không tìm thấy thông báo');
        }

        if (recipient.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền đánh dấu thông báo này');
        }

        return this.prisma.notificationRecipient.update({
            where: { id: recipientId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    async markAllAsRead(userId: string) {
        await this.prisma.notificationRecipient.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
    }
}
