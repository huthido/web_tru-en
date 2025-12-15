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
  constructor(private configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return next.handle().pipe(
      map((data) => {
        // Set HTTP-only cookies for tokens
        if (data?.accessToken) {
          response.cookie('access_token', data.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
          });
        }

        if (data?.refreshToken) {
          response.cookie('refresh_token', data.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

