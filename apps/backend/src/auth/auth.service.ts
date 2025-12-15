import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload, TokenResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenResponseDto> {
    const { email, username, password, confirmPassword, displayName } = registerDto;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    // Check if email exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Check if username exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username đã được sử dụng');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate avatar placeholder if not provided (for local registration)
    // Using UI Avatars service to generate avatar from username
    const avatarPlaceholder = this.generateAvatarPlaceholder(username, displayName || username);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        displayName: displayName || username,
        avatar: avatarPlaceholder,
        provider: 'local',
        emailVerified: false, // Local registration requires email verification
        isActive: true,
        role: 'USER',
      } as Prisma.UserUncheckedCreateInput,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || this.generateAvatarPlaceholder(user.username, user.displayName || user.username),
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const { emailOrUsername, password } = loginDto;

    const user = await this.validateUser(emailOrUsername, password);
    if (!user) {
      // Don't reveal whether email/username exists or password is wrong for security
      throw new UnauthorizedException('Email/username hoặc mật khẩu không đúng');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || this.generateAvatarPlaceholder(user.username, user.displayName || user.username),
        role: user.role,
      },
    };
  }

  async validateUser(
    emailOrUsername: string,
    password: string
  ): Promise<{
    id: string;
    email: string;
    username: string;
    role: string;
    displayName?: string | null;
    avatar?: string | null;
  } | null> {
    // Normalize input (trim)
    const normalizedInput = emailOrUsername.trim();
    
    // Find user by email or username using OR condition
    // This is more efficient than separate queries
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          // Email lookup (case-insensitive)
          {
            email: {
              equals: normalizedInput,
              mode: 'insensitive',
            },
          },
          // Username lookup (case-sensitive)
          {
            username: normalizedInput,
          },
        ],
      },
    });

    if (!user) {
      return null;
    }

    if (!user.password) {
      // User exists but has no password (OAuth user)
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async validateOAuthUser(oauthUser: {
    provider: string;
    providerId: string;
    email: string;
    displayName?: string;
    avatar?: string;
    username?: string;
    accessToken?: string;
  }) {
    // Find existing user by provider and providerId
    let user = await this.prisma.user.findFirst({
      where: {
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      } as Prisma.UserWhereInput,
    });

    if (user) {
      // Update user info if needed
      if (oauthUser.avatar && oauthUser.avatar !== user.avatar) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatar: oauthUser.avatar },
        });
      }
    } else {
      // Check if email exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
      });

      if (existingUser) {
        // Link OAuth account to existing user
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            avatar: oauthUser.avatar || existingUser.avatar,
            displayName: oauthUser.displayName || existingUser.displayName,
            emailVerified: true,
          } as Prisma.UserUncheckedUpdateInput,
        });
      } else {
        // Create new user
        const username = oauthUser.username || this.generateUsernameFromEmail(oauthUser.email);
        // If OAuth doesn't provide avatar, generate placeholder
        const avatar = oauthUser.avatar || this.generateAvatarPlaceholder(username, oauthUser.displayName || username);
        
        user = await this.prisma.user.create({
          data: {
            email: oauthUser.email,
            username,
            displayName: oauthUser.displayName || username,
            avatar,
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            emailVerified: true, // OAuth emails are pre-verified
            isActive: true,
            role: 'USER',
            password: null, // OAuth users don't have password
          } as unknown as Prisma.UserUncheckedCreateInput,
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  private generateUsernameFromEmail(email: string): string {
    const baseUsername = email.split('@')[0];
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseUsername}_${randomSuffix}`;
  }

  /**
   * Generate avatar placeholder URL for users who register with email/password
   * Uses UI Avatars service to create a simple avatar from name/username
   */
  private generateAvatarPlaceholder(name: string, displayName?: string): string {
    // Use displayName or name for avatar generation
    const avatarName = displayName || name;
    // Remove special characters and encode for URL
    const cleanName = avatarName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    // Use first letter of each word, max 2 letters
    const initials = cleanName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || cleanName.charAt(0).toUpperCase();

    // Generate avatar using UI Avatars service
    // Format: https://ui-avatars.com/api/?name=Name&size=200&background=random&color=fff&bold=true
    const colors = [
      '0ea5e9', // blue
      '8b5cf6', // purple
      'ec4899', // pink
      'f59e0b', // amber
      '10b981', // green
      'ef4444', // red
      '6366f1', // indigo
      '14b8a6', // teal
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=${randomColor}&color=fff&bold=true&format=png`;
  }

  async generateTokens(user: {
    id: string;
    email: string;
    username: string;
    role: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
    });

    // Optionally store refreshToken in database
    // await this.prisma.user.update({
    //   where: { id: user.id },
    //   data: { refreshToken },
    // });

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User không tồn tại hoặc đã bị khóa');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmNewPassword } = changePasswordDto;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Mật khẩu mới xác nhận không khớp');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('User không tồn tại hoặc không có mật khẩu');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async logout(userId: string): Promise<void> {
    // Optionally invalidate refresh token
    // await this.prisma.user.update({
    //   where: { id: userId },
    //   data: { refreshToken: null },
    // });
  }
}
