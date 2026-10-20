import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Web Push (trình duyệt, chuẩn VAPID) — báo cả khi đã đóng tab, khác token
 * Expo của app mobile (PushService).
 *
 * Bật bằng env (đặt trong Coolify rồi Redeploy):
 *   WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY,
 *   WEB_PUSH_SUBJECT (mailto:… hoặc https://yeuyeu.net — tuỳ chọn).
 * Thiếu khoá → service tắt, GET /notifications/web-push/config báo
 * enabled=false và web ẩn nút bật thông báo. `web-push` nạp lazy như
 * expo-server-sdk để backend vẫn chạy khi gói chưa cài.
 */
@Injectable()
export class WebPushService implements OnModuleInit {
    private readonly logger = new Logger(WebPushService.name);
    private webpush: any | null = null;
    private publicKey: string | null = null;

    constructor(private prisma: PrismaService) { }

    onModuleInit() {
        const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
        const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
        if (!pub || !priv) {
            this.logger.log('Web Push tắt (chưa đặt WEB_PUSH_VAPID_PUBLIC_KEY / PRIVATE_KEY).');
            return;
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const webpush = require('web-push');
            webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT?.trim() || 'https://yeuyeu.net', pub, priv);
            this.webpush = webpush;
            this.publicKey = pub;
            this.logger.log('Web Push (VAPID) initialized.');
        } catch (e: any) {
            this.logger.warn(`Web Push disabled: ${e?.message ?? e}`);
            this.webpush = null;
        }
    }

    getConfig() {
        return { enabled: !!this.webpush, publicKey: this.publicKey };
    }

    async subscribe(
        userId: string,
        sub: { endpoint: string; keys: { p256dh: string; auth: string } },
        userAgent?: string,
    ) {
        // 1 endpoint = 1 trình duyệt; đổi tài khoản trên cùng máy → chuyển chủ.
        await this.prisma.webPushSubscription.upsert({
            where: { endpoint: sub.endpoint },
            create: {
                userId,
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
                userAgent: userAgent?.slice(0, 300) ?? null,
            },
            update: {
                userId,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
                userAgent: userAgent?.slice(0, 300) ?? null,
                lastUsed: new Date(),
            },
        });
        return { subscribed: true };
    }

    async unsubscribe(userId: string, endpoint: string) {
        await this.prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
        return { subscribed: false };
    }

    /** Best-effort: lỗi 404/410 = trình duyệt đã huỷ đăng ký → xoá bản ghi. */
    async sendToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
        if (!this.webpush) return;
        const subs = await this.prisma.webPushSubscription.findMany({
            where: { userId },
            select: { id: true, endpoint: true, p256dh: true, auth: true },
        });
        if (subs.length === 0) return;

        const body = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/thong-bao',
            tag: payload.tag,
        });
        const dead: string[] = [];
        await Promise.all(
            subs.map(async (s) => {
                try {
                    await this.webpush.sendNotification(
                        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                        body,
                        { TTL: 24 * 60 * 60 },
                    );
                } catch (e: any) {
                    const code = e?.statusCode;
                    if (code === 404 || code === 410) dead.push(s.id);
                    else this.logger.warn(`Web push failed (${code ?? 'net'}): ${e?.message ?? e}`);
                }
            }),
        );
        if (dead.length > 0) {
            await this.prisma.webPushSubscription.deleteMany({ where: { id: { in: dead } } }).catch(() => undefined);
        }
    }
}
