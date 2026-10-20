import { ValidationPipe } from '@nestjs/common';
import { WebPushSubscribeDto } from './web-push.dto';

/** Cùng cấu hình ValidationPipe với main.ts (whitelist + forbidNonWhitelisted). */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta = { type: 'body' as const, metatype: WebPushSubscribeDto };

describe('WebPushSubscribeDto', () => {
    const base = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'BPx', auth: 'xyz' },
    };

    it('nhận đúng PushSubscription.toJSON() của Chrome (có expirationTime: null)', async () => {
        await expect(pipe.transform({ ...base, expirationTime: null }, meta)).resolves.toBeDefined();
    });

    it('nhận khi không có expirationTime', async () => {
        await expect(pipe.transform(base, meta)).resolves.toBeDefined();
    });

    it('từ chối endpoint không phải https', async () => {
        await expect(pipe.transform({ ...base, endpoint: 'http://fcm.googleapis.com/x' }, meta)).rejects.toBeDefined();
    });
});
