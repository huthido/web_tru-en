import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Guard cho AI agent / service ngoài truy cập qua header `x-api-key`.
 * Key đặt trong env AGENT_API_KEY — nếu chưa cấu hình thì từ chối toàn bộ
 * (fail-closed). Route dùng guard này phải đánh dấu @Public() để JWT global
 * guard không chặn trước.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.AGENT_API_KEY;
    if (!expected) {
      throw new UnauthorizedException('Agent API chưa được cấu hình');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-api-key'];
    if (typeof provided !== 'string' || provided.length === 0) {
      throw new UnauthorizedException('Thiếu API key');
    }

    // So sánh timing-safe — tránh leak độ dài/nội dung key qua timing.
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('API key không hợp lệ');
    }

    return true;
  }
}
