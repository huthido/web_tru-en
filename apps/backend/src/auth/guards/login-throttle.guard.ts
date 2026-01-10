import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

// Extend Request interface to include throttlerKey
interface ExtendedRequest extends Request {
  throttlerKey?: string;
}

@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();

    // Get identifier for rate limiting (IP + user agent for better tracking)
    const ip = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'] || '';
    const identifier = `${ip}:${userAgent}`;

    // Override throttler key to use custom identifier
    request.throttlerKey = identifier;

    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw new ThrottlerException(
          'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
        );
      }
      throw error;
    }
  }
}
