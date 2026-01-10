import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CookieInterceptor } from './interceptors/cookie.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';

@Controller('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) { }

  // 🍎 Helper: Create iOS-compatible cookie options
  private createCookieOptions(req: Request | Response['req']) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const frontendDomain = new URL(frontendUrl).hostname;
    const backendHost = (req as any).get?.('host') || (req as any).headers?.host || '';
    const backendDomain = backendHost.split(':')[0];
    const isCrossOrigin = frontendDomain !== backendDomain;
    const isHttps = frontendUrl.startsWith('https://') || (req as any).protocol === 'https';

    return {
      httpOnly: true,
      secure: isHttps,
      sameSite: (isCrossOrigin && isHttps ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      // 🔥 NOTE: Domain attribute removed for now - causes issues in development
      // Will be added back for production only when needed
    };
  }

  @Public()
  @Post('register')
  @UseInterceptors(CookieInterceptor)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registrations per minute
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CookieInterceptor)
  @UseGuards(LoginThrottleGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Res() res: Response) {
    await this.authService.logout(user.id);
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return res.json({
      success: true,
      message: 'Đăng xuất thành công',
      timestamp: new Date().toISOString(),
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CookieInterceptor)
  async refreshToken(@Req() req: Request) {
    const refreshToken = req.cookies?.['refresh_token'] || req.body.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không được cung cấp');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          role: user.role,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    await this.authService.changePassword(user.id, changePasswordDto);
    return {
      message: 'Đổi mật khẩu thành công',
    };
  }

  @Post('update-email')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CookieInterceptor)
  async updateEmail(
    @CurrentUser() user: any,
    @Body() updateEmailDto: UpdateEmailDto
  ) {
    return this.authService.updateEmail(user.id, updateEmailDto.email);
  }

  // 🔥 NEW: Email Verification Endpoints
  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CookieInterceptor)
  async verifyEmail(@Req() req: Request) {
    const token = req.query.token as string;
    if (!token) {
      throw new BadRequestException('Token là bắt buộc');
    }
    // This will return tokens + user info, CookieInterceptor will set cookies
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }) {
    const { email } = body;
    if (!email) {
      throw new BadRequestException('Email là bắt buộc');
    }

    // Find user by email
    const user = await this.authService['prisma'].user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email đã được xác thực');
    }

    await this.authService['sendEmailVerification'](user.id, user.email, user.displayName || user.username);

    return {
      success: true,
      message: 'Email xác thực đã được gửi lại',
    };
  }

  @Public()
  @Post('complete-email')
  @HttpCode(HttpStatus.OK)
  async completeEmail(
    @Body() body: { code: string; email: string },
    @Res() res: Response
  ) {
    try {
      const { code, email } = body;
      if (!code || !email) {
        throw new BadRequestException('Code and email are required');
      }

      // Complete email and get tokens
      const tokens = await this.authService.completeEmailWithCode(code, email);

      // 🍎 iOS Safari compatible cookie options
      const cookieOptions = this.createCookieOptions(res.req);

      res.cookie('access_token', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        success: true,
        message: 'Email updated successfully',
      });
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to complete email');
    }
  }

  // OAuth Routes
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const result = req.user as any;

      // Check if needs verification
      if (result.needsVerification) {
        // User needs email verification
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/registration-success?email=${encodeURIComponent(result.email)}&oauth=true`);
        return;
      }

      const user = result.user || result;
      if (!user || !user.id || !user.email || !user.username || !user.role) {
        throw new UnauthorizedException('Authentication failed');
      }

      // Create one-time code (iOS Safari compatible)
      const code = await this.authService.createOneTimeCode(user.id);

      // Redirect to frontend with code (NOT token)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
    } catch (error) {
      this.logger.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Public()
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(@Req() req: Request, @Body() body: { code: string }, @Res() res: Response) {
    try {
      const { code } = body;
      if (!code) {
        throw new BadRequestException('Code is required');
      }

      // Exchange code for tokens
      const tokens = await this.authService.exchangeCode(code);

      // 🍎 iOS Safari compatible cookie options
      const cookieOptions = this.createCookieOptions(req);

      res.cookie('access_token', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.cookie('refresh_token', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        success: true,
        message: 'Authentication successful',
      });
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to exchange code');
    }
  }

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const result = req.user as any;

      // Check if needs verification
      if (result.needsVerification) {
        // User needs email verification
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/registration-success?email=${encodeURIComponent(result.email)}&oauth=true`);
        return;
      }

      const user = result.user || result;
      if (!user || !user.id || !user.email || !user.username || !user.role) {
        throw new UnauthorizedException('Authentication failed');
      }

      // Check if user needs to provide email (placeholder email detected)
      const needsEmail = user.email?.includes('@facebook.placeholder');

      // Create one-time code (iOS Safari compatible)
      const code = await this.authService.createOneTimeCode(user.id);

      // Redirect to frontend with code
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (needsEmail) {
        res.redirect(`${frontendUrl}/auth/complete-email?code=${code}&needsEmail=true`);
      } else {
        res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
      }
    } catch (error) {
      this.logger.error('Facebook OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
}

