import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';

/** Header frontend gắn vào request render phía server (SSR/ISR). */
export const INTERNAL_SSR_HEADER = 'x-internal-ssr';

/** So khớp khoá nội bộ (constant-time). Khoá rỗng/ngắn = tắt tính năng. */
export function isInternalSsrRequest(headerValue: unknown, secret = process.env.INTERNAL_API_SECRET): boolean {
    if (!secret || secret.length < 16 || typeof headerValue !== 'string') return false;
    const a = Buffer.from(headerValue);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * ThrottlerGuard bỏ qua request render phía server của frontend.
 *
 * Request SSR/ISR từ container frontend đều đến backend từ CÙNG một IP
 * (container frontend) → nếu throttle, mọi khách + bot dùng chung hạn mức
 * 100 req/phút; vượt thì serverGet nhận 429 và trang render "Không tìm thấy"
 * rồi bị ISR cache. Frontend gắn header `x-internal-ssr` = INTERNAL_API_SECRET
 * (env server-only, không bao giờ xuống trình duyệt) để được bỏ qua.
 * Không đặt khoá → giữ nguyên hành vi cũ.
 */
@Injectable()
export class InternalAwareThrottlerGuard extends ThrottlerGuard {
    protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
        if (context.getType() === 'http') {
            const req = context.switchToHttp().getRequest();
            if (isInternalSsrRequest(req?.headers?.[INTERNAL_SSR_HEADER])) return true;
        }
        return super.shouldSkip(context);
    }

    /**
     * Đã đăng nhập → đếm theo TÀI KHOẢN thay vì IP: IP lấy từ X-Forwarded-For
     * có thể bị giả nếu ai đó gọi thẳng cổng backend (không qua proxy). Cần
     * JwtAuthGuard chạy TRƯỚC guard này (xem thứ tự APP_GUARD ở app.module).
     */
    protected async getTracker(req: Record<string, any>): Promise<string> {
        const userId = req?.user?.id;
        if (typeof userId === 'string' && userId) return `user:${userId}`;
        return super.getTracker(req);
    }
}
