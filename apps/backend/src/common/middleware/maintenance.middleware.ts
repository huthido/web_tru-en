import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MaintenanceMiddleware.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) { }

  async use(req: Request, res: Response, next: NextFunction) {
    // CRITICAL: Skip maintenance check for auth endpoints
    // Auth endpoints (login, register, me, refresh, etc.) must work regardless of maintenance mode
    // This prevents blocking authentication flow
    if (req.path.startsWith('/api/auth')) {
      return next();
    }

    // Skip maintenance check for settings endpoint (needed to get maintenance status)
    if (req.path === '/api/settings') {
      return next();
    }

    // Skip maintenance check for admin routes (admin can always access)
    if (req.path.startsWith('/api/admin')) {
      return next();
    }

    try {
      // Get settings from database
      let settings;
      try {
        settings = await this.prisma.settings.findFirst();
      } catch (dbError: any) {
        // If database is unavailable, assume maintenance mode is off
        // This allows the app to continue functioning even when database is down
        if (dbError.code === 'P1001' || dbError.code === 'P1002' || dbError.message?.includes('Can\'t reach database')) {
          console.warn('Database unavailable in maintenance middleware, assuming maintenance mode is off');
          return next(); // Continue without blocking
        }
        // Re-throw other database errors
        throw dbError;
      }

      // If maintenance mode is enabled
      if (settings?.maintenanceMode) {
        // Check if user is admin
        const token = req.cookies?.['access_token'] ||
          req.headers.authorization?.replace('Bearer ', '');

        let isAdmin = false;

        if (token) {
          try {
            const payload = this.jwtService.verify(token, {
              secret: this.configService.get<string>('JWT_SECRET'),
            });

            // Check if user is admin
            if (payload?.role === 'ADMIN') {
              isAdmin = true;
            }
          } catch (error) {
            // Token invalid or expired, user is not admin
            isAdmin = false;
          }
        }

        // If user is not admin, show maintenance message
        if (!isAdmin) {
          throw new HttpException(
            {
              success: false,
              error: 'Website đang bảo trì',
              message: settings.maintenanceMessage || 'Website đang được bảo trì. Vui lòng quay lại sau.',
              maintenanceMode: true,
            },
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
      }
    } catch (error) {
      // If error is already HttpException (maintenance mode), re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      // Otherwise, log error and continue (don't block if settings check fails)
      console.error('Error checking maintenance mode:', error);
    }

    next();
  }
}
