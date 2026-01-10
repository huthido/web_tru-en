import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CookieInterceptor implements NestInterceptor {
  constructor(private configService: ConfigService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return next.handle().pipe(
      map((data) => {
        // Handle case where data is undefined (e.g., redirect responses)
        if (!data) {
          return data;
        }

        // Set HTTP-only cookies for tokens
        if (data?.accessToken) {
          response.cookie('access_token', data.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 1 * 60 * 60 * 1000, // 🔥 FIXED: 1 hour (not 7 days!)
            path: '/',
          });
        }

        if (data?.refreshToken) {
          response.cookie('refresh_token', data.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (max for rememberMe)
            path: '/',
          });
        }

        // Remove tokens from response body for security
        const { accessToken, refreshToken, ...rest } = data;
        return rest;
      })
    );
  }
}

