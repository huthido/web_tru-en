import { Injectable, NotFoundException, ForbiddenException, MessageEvent, OnModuleInit, Logger } from '@nestjs/common';
import { Subject, Observable, merge, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from './push.service';
import { RedisService } from '../redis/redis.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../common/utils/pagination.util';

const SSE_CHANNEL = 'notifications:sse';

@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly logger = new Logger(NotificationsService.name);
    /**
     * Local fan-out for SSE subscribers attached to THIS backend instance.
     * - When Redis is enabled: every notifyUser publishes to SSE_CHANNEL; the
     *   subscriber handler in onModuleInit forwards inbound messages into
     *   this Subject, so SSE clients on any instance get the tick.
     * - When Redis is not configured: notifyUser writes directly into this
     *   Subject (single-instance fallback).
     */
    private readonly events$ = new Subject<{ userId: string }>();

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private redis: RedisService,
        private pushService: PushService,
    ) {}

    async onModuleInit() {
        if (!this.redis.isEnabled()) {
            this.logger.warn('Redis pub/sub disabled — SSE works only on a single instance.');
            return;
        }
        await this.redis.subscribe(SSE_CHANNEL, (msg) => {
            try {
                const evt = JSON.parse(msg) as { userId: string };
                if (evt?.userId) this.events$.next({ userId: evt.userId });
            } catch (e: any) {
                this.logger.warn(`Bad SSE payload on ${SSE_CHANNEL}: ${e.message}`);
            }
        });
        this.logger.log(`Subscribed to Redis channel ${SSE_CHANNEL} for cross-instance SSE.`);
    }

    /**
     * Emit an SSE tick — Redis pub/sub if available (cross-instance),
     * else direct in-process. Idempotent at the SSE level.
     */
    private async emitSse(userId: string) {
        if (this.redis.isEnabled()) {
            await this.redis.publish(SSE_CHANNEL, JSON.stringify({ userId }));
        } else {
            this.events$.next({ userId });
        }
    }

    /**
     * Create a personal notification for ONE user (auto events like
     * donate/sale). No email, no role broadcast. Emits an SSE tick so the
     * recipient's bell updates live. Best-effort — callers should not let a
     * failure here break their own transaction.
     */
    /**
     * Broadcast "chương mới" tới mọi follower của 1 truyện. Best-effort,
     * batched cursor 500 followers/round để không OOM với truyện 100k follow.
     * Gọi fire-and-forget (`void this.fanoutChapterPublished(...)`); không
     * await trong response path.
     *
     * `chapter`: cần `id, title, slug`, story: `{ id, title, slug }`.
     */
    async fanoutChapterPublished(chapter: {
        id: string;
        title: string;
        slug: string;
        story: { id: string; title: string; slug: string };
    }) {
        const BATCH = 500;
        let cursor: { id: string } | undefined;
        let totalNotified = 0;
        try {
            while (true) {
                const followers = await this.prisma.follow.findMany({
                    where: { storyId: chapter.story.id },
                    select: { id: true, userId: true },
                    orderBy: { id: 'asc' },
                    take: BATCH,
                    ...(cursor ? { cursor, skip: 1 } : {}),
                });
                if (followers.length === 0) break;
                await Promise.allSettled(
                    followers.map((f) =>
                        this.notifyUser(f.userId, {
                            title: `Chương mới: ${chapter.title}`,
                            content: `"${chapter.story.title}" vừa cập nhật chương mới.`,
                            type: NotificationType.STORY_NEW_CHAPTER,
                            actionUrl: `/story/${chapter.story.slug}/chapter/${chapter.slug}`,
                        }),
                    ),
                );
                totalNotified += followers.length;
                if (followers.length < BATCH) break;
                cursor = { id: followers[followers.length - 1].id };
            }
            if (totalNotified > 0) {
                this.logger.log(
                    `Fanout chương "${chapter.title}" tới ${totalNotified} follower.`,
                );
            }
        } catch (e: any) {
            this.logger.warn(`fanoutChapterPublished failed: ${e?.message ?? e}`);
        }
    }

    async notifyUser(
        userId: string,
        data: {
            title: string;
            content: string;
            type?: NotificationType;
            priority?: NotificationPriority;
            actionUrl?: string;
        },
    ) {
        const notification = await this.prisma.notification.create({
            data: {
                title: data.title,
                content: data.content,
                type: data.type || NotificationType.INFO,
                priority: data.priority || NotificationPriority.NORMAL,
                actionUrl: data.actionUrl || null,
                targetRole: null,
                sendEmail: false,
                // createdById omitted — system/auto notification, no creator.
            },
        });
        await this.prisma.notificationRecipient.create({
            data: { notificationId: notification.id, userId },
        });
        await this.emitSse(userId);
        // Mobile push best-effort, không await để không kéo dài transaction caller.
        this.pushService
            .sendToUser(userId, {
                title: data.title,
                body: data.content,
                data: { actionUrl: data.actionUrl, type: notification.type },
            })
            .catch((e: any) => this.logger.warn(`Push notify failed: ${e?.message ?? e}`));
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

        // Build target filter once.
        const whereClause: any = { isActive: true, emailVerified: true };
        if (dto.targetRole) {
            whereClause.role = dto.targetRole;
        }

        // Cursor-paginated batch: 500 users per round.
        // Why? Loading ALL active+verified users into Node memory does not
        // scale past ~50k users (each row ~500B → 25MB+, plus the recipients
        // array). Batching also lets a single broadcast survive a transient
        // DB hiccup mid-stream — only the failing batch retries, not the
        // whole 100k-row INSERT.
        const BATCH_SIZE = 500;
        let cursor: { id: string } | undefined;
        let totalRecipients = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const batch = await this.prisma.user.findMany({
                where: whereClause,
                select: { id: true, email: true, displayName: true, username: true },
                orderBy: { id: 'asc' },
                take: BATCH_SIZE,
                ...(cursor ? { cursor, skip: 1 } : {}),
            });
            if (batch.length === 0) break;

            await this.prisma.notificationRecipient.createMany({
                data: batch.map((u) => ({
                    notificationId: notification.id,
                    userId: u.id,
                })),
                skipDuplicates: true,
            });

            if (dto.sendEmail) {
                // Fire-and-forget per batch. Each email goes through the
                // BullMQ queue (or sync fallback), so we don't await all
                // 500 promises concurrently.
                this.sendNotificationEmails(notification, batch).catch((err) =>
                    console.error('Notification email batch failed:', err),
                );
            }

            totalRecipients += batch.length;
            if (batch.length < BATCH_SIZE) break;
            cursor = { id: batch[batch.length - 1].id };
        }

        return {
            ...notification,
            recipientCount: totalRecipients,
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
