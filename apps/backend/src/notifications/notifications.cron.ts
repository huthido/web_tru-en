import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Retention cho hệ thống notification:
 *
 * - Notification > 30 ngày bị xoá. NotificationRecipient cascade theo FK.
 *   Lý do giới hạn: app realtime, user ít xem lại quá xa; bảng phình to
 *   sẽ làm chậm query "unread".
 * - UserPushToken không dùng > 90 ngày bị xoá (tránh gửi push tới thiết
 *   bị đã uninstall app — Expo trả lỗi DeviceNotRegistered).
 *
 * `@nestjs/schedule` được import động (lazy require) — nếu chưa cài thì
 * decorator no-op và cron không chạy; backend vẫn boot.
 */
@Injectable()
export class NotificationsCron {
    private readonly logger = new Logger(NotificationsCron.name);

    constructor(private prisma: PrismaService) {}

    @Cron('0 3 * * *')
    async purgeOldNotifications() {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        try {
            const res = await this.prisma.notification.deleteMany({
                where: { createdAt: { lt: cutoff } },
            });
            this.logger.log(`Purged ${res.count} notifications older than 30d.`);
        } catch (e: any) {
            this.logger.error(`purgeOldNotifications failed: ${e?.message ?? e}`);
        }
    }

    @Cron('0 4 * * 0')
    async purgeInactivePushTokens() {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        try {
            const res = await this.prisma.userPushToken.deleteMany({
                where: { lastUsed: { lt: cutoff } },
            });
            this.logger.log(`Purged ${res.count} inactive push tokens (>90d).`);
        } catch (e: any) {
            this.logger.error(`purgeInactivePushTokens failed: ${e?.message ?? e}`);
        }
    }
}
