import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gửi push notification cho 1 user qua Expo SDK (gói chính chủ, free).
 *
 * - Hỗ trợ Expo tokens (ExponentPushToken[xxx]) — Expo proxy về FCM/APNs.
 * - Nếu user có nhiều device (mobile + tablet), gửi đến tất cả token đang
 *   active.
 * - Best-effort: log warning khi chunk fail, không throw để không vỡ
 *   `notifyUser` ở caller.
 *
 * `expo-server-sdk` được import động (lazy require) để backend vẫn boot
 * được khi gói chưa cài (CI build) — runtime sẽ no-op.
 */
@Injectable()
export class PushService implements OnModuleInit {
    private readonly logger = new Logger(PushService.name);
    private expo: any | null = null;

    constructor(private prisma: PrismaService) {}

    onModuleInit() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { Expo } = require('expo-server-sdk');
            this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
            this.logger.log('Expo push SDK initialized.');
        } catch (e: any) {
            this.logger.warn(
                `expo-server-sdk chưa cài; push notification disabled. (${e?.message ?? e})`,
            );
            this.expo = null;
        }
    }

    async sendToUser(
        userId: string,
        payload: { title: string; body: string; data?: Record<string, any> },
    ) {
        if (!this.expo) return;

        const tokens = await this.prisma.userPushToken.findMany({
            where: { userId },
            select: { id: true, token: true },
        });
        if (tokens.length === 0) return;

        const Expo = require('expo-server-sdk').Expo;
        const messages = tokens
            .filter((t: { token: string }) => Expo.isExpoPushToken(t.token))
            .map((t: { token: string }) => ({
                to: t.token,
                sound: 'default',
                title: payload.title,
                body: payload.body,
                data: payload.data ?? {},
            }));
        if (messages.length === 0) return;

        const chunks = this.expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                await this.expo.sendPushNotificationsAsync(chunk);
            } catch (e: any) {
                this.logger.warn(`Push chunk failed: ${e?.message ?? e}`);
            }
        }

        // Cập nhật lastUsed để cron cleanup không xoá token vừa dùng.
        this.prisma.userPushToken
            .updateMany({
                where: { userId, token: { in: messages.map((m: { to: string }) => m.to) } },
                data: { lastUsed: new Date() },
            })
            .catch(() => { /* best-effort */ });
    }

    async registerToken(
        userId: string,
        token: string,
        platform: string,
        deviceId?: string,
    ) {
        // Upsert: 1 token chỉ thuộc 1 user; nếu user khác đã có token này
        // (đổi máy), cập nhật về user hiện tại.
        return this.prisma.userPushToken.upsert({
            where: { token },
            create: { userId, token, platform, deviceId: deviceId ?? null },
            update: { userId, platform, deviceId: deviceId ?? null, lastUsed: new Date() },
        });
    }

    async removeToken(userId: string, token: string) {
        await this.prisma.userPushToken.deleteMany({ where: { userId, token } });
        return { success: true };
    }
}
