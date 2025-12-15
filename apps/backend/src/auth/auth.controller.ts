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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CookieInterceptor } from './interceptors/cookie.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';

@Controller('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(private authService: AuthService) { }

  @Public()
  @Post('register')
  @UseInterceptors(CookieInterceptor)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(CookieInterceptor)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Res() res: Response) {
    await this.authService.logout(user.id);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
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
  @UseInterceptors(CookieInterceptor)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    if (!user || !user.id || !user.email || !user.username || !user.role) {
      throw new UnauthorizedException('Authentication failed');
    }
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${redirectUrl}/auth/callback?token=${tokens.accessToken}`);
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
  @UseInterceptors(CookieInterceptor)
  async facebookAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    if (!user || !user.id || !user.email || !user.username || !user.role) {
      throw new UnauthorizedException('Authentication failed');
    }
    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${redirectUrl}/auth/callback?token=${tokens.accessToken}`);
  }
}

