import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Prisma } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload, TokenResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService
  ) { }

  async register(registerDto: RegisterDto): Promise<{
    success: boolean;
    message: string;
    requiresVerification?: boolean;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: any;
  }> {
    const { email, username, password, confirmPassword, displayName } = registerDto;

    // Get settings to check email verification requirement
    const settings = await this.prisma.settings.findFirst();
    const requireEmailVerification = settings?.requireEmailVerification ?? false;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    // Check if email and username exist in parallel (optimization)
    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    if (existingUsername) {
      throw new ConflictException('Username đã được sử dụng');
    }

    // Hash password with bcrypt (salt rounds = 12 for better security)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate avatar placeholder if not provided (for local registration)
    const avatarPlaceholder = this.generateAvatarPlaceholder(username, displayName || username);

    // 🔥 NEW: Check if email verification is required
    const emailVerified = !requireEmailVerification; // If not required, set to true
    const isActive = !requireEmailVerification; // If not required, set to true

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        displayName: displayName || username,
        avatar: avatarPlaceholder,
        provider: 'local',
        emailVerified,
        isActive,
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

    if (requireEmailVerification) {
      // 🔥 Email verification required: Send email and return verification message
      this.logger.log(`User registered: ${user.email} (${user.id}) - Pending email verification`);
      await this.sendEmailVerification(user.id, user.email, user.displayName || user.username);

      return {
        success: true,
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
        requiresVerification: true,
        email: user.email,
      };
    } else {
      // 🔥 Email verification NOT required: Auto-login user
      this.logger.log(`User registered: ${user.email} (${user.id}) - Auto-activated (no email verification required)`);

      // Generate tokens for immediate login
      const tokens = await this.generateTokens(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        false // Don't remember by default
      );

      return {
        success: true,
        message: 'Đăng ký thành công!',
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
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const { emailOrUsername, password, rememberMe } = loginDto;

    const user = await this.validateUser(emailOrUsername, password);
    if (!user) {
      // Log failed attempt
      this.logger.warn(`Failed login attempt: ${emailOrUsername}`);
      // Don't reveal whether email/username exists or password is wrong for security
      throw new UnauthorizedException('Email/username hoặc mật khẩu không đúng');
    }

    // Log successful login
    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    // Generate tokens with remember me flag
    const tokens = await this.generateTokens(user, rememberMe ?? false);

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
    // Normalize input (trim and lowercase for email, trim only for username)
    const normalizedInput = emailOrUsername.trim();
    const isEmail = normalizedInput.includes('@');

    // Find user by email or username using OR condition
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: {
              equals: isEmail ? normalizedInput.toLowerCase() : normalizedInput,
              mode: 'insensitive',
            },
          },
          {
            username: {
              equals: normalizedInput,
            },
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

    // 🔥 NEW: Check if email is verified (only if email verification is required)
    const settings = await this.prisma.settings.findFirst();
    const requireEmailVerification = settings?.requireEmailVerification ?? false;

    if (requireEmailVerification && !user.emailVerified) {
      throw new UnauthorizedException(
        'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.'
      );
    }

    // 🔥 CHECK: Account must be active
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa hoặc chưa được kích hoạt');
    }

    // Verify password (trim password input to handle whitespace issues)
    const trimmedPassword = password.trim();
    const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
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
    needsEmail?: boolean;
  }): Promise<{ user: any; needsVerification?: boolean; email?: string }> {
    // Get settings to check email verification requirement
    const settings = await this.prisma.settings.findFirst();
    const requireEmailVerification = settings?.requireEmailVerification ?? false;

    // 🔥 STEP 1: Find existing user by provider and providerId
    let user = await this.prisma.user.findFirst({
      where: {
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      } as Prisma.UserWhereInput,
    });

    if (user) {
      // 🔥 CASE 1: User đã tồn tại với provider này

      // Check if user can login (based on email verification requirement)
      const canLogin = requireEmailVerification
        ? (user.isActive && user.emailVerified)
        : user.isActive;

      if (canLogin) {
        // ✅ User có thể đăng nhập → Cho đăng nhập ngay
        this.logger.log(`OAuth user logged in: ${user.email} (${user.id}) - Active`);

        // Update avatar/displayName if needed
        const updateData: any = {};
        if (oauthUser.avatar && oauthUser.avatar !== user.avatar) {
          updateData.avatar = oauthUser.avatar;
        }
        if (oauthUser.displayName && oauthUser.displayName !== user.displayName) {
          updateData.displayName = oauthUser.displayName;
        }

        if (Object.keys(updateData).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }

        const { password: _, ...result } = user;
        return { user: result };
      } else {
        // ⚠️ User chưa active hoặc chưa verify → Gửi lại email verification (nếu required)
        if (requireEmailVerification) {
          this.logger.warn(`OAuth user not verified: ${user.email} (${user.id}) - Resending verification`);
          await this.sendEmailVerification(user.id, user.email, user.displayName || user.username);
        } else {
          // If email verification not required, activate account
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              isActive: true,
              emailVerified: true,
            },
          });
          this.logger.log(`OAuth user activated: ${user.email} (${user.id}) - No verification required`);
        }

        const { password: _, ...result } = user;
        return { user: result, needsVerification: requireEmailVerification, email: user.email };
      }
    } else {
      // 🔥 STEP 2: Check if email exists (link account)
      const existingUser = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
      });

      if (existingUser) {
        // 🔥 CASE 2: Email đã tồn tại nhưng chưa link với OAuth này

        const canLogin = requireEmailVerification
          ? (existingUser.isActive && existingUser.emailVerified)
          : existingUser.isActive;

        if (canLogin) {
          // ✅ User có thể đăng nhập → Link OAuth account
          user = await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              provider: oauthUser.provider,
              providerId: oauthUser.providerId,
              avatar: oauthUser.avatar || existingUser.avatar,
              displayName: oauthUser.displayName || existingUser.displayName,
            } as Prisma.UserUncheckedUpdateInput,
          });

          this.logger.log(`OAuth linked to existing active user: ${user.email} (${user.id})`);
          const { password: _, ...result } = user;
          return { user: result };
        } else {
          // ⚠️ User tồn tại nhưng chưa active → Gửi lại email (nếu required) hoặc activate
          this.logger.warn(`Existing user not verified: ${existingUser.email} - ${requireEmailVerification ? 'Resending verification' : 'Activating'}`);

          // Link OAuth data
          const updateData: any = {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            avatar: oauthUser.avatar || existingUser.avatar,
            displayName: oauthUser.displayName || existingUser.displayName,
          };

          if (!requireEmailVerification) {
            updateData.isActive = true;
            updateData.emailVerified = true;
          }

          user = await this.prisma.user.update({
            where: { id: existingUser.id },
            data: updateData as Prisma.UserUncheckedUpdateInput,
          });

          if (requireEmailVerification) {
            await this.sendEmailVerification(user.id, user.email, user.displayName || user.username);
          }

          const { password: _, ...result } = user;
          return { user: result, needsVerification: requireEmailVerification, email: user.email };
        }
      } else {
        // 🔥 CASE 3: User hoàn toàn mới → Tạo mới
        let username = oauthUser.username;
        if (!username) {
          if (oauthUser.email.includes('@facebook.placeholder')) {
            const baseName = oauthUser.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '_') ||
              `fb_${oauthUser.providerId}`;
            username = `${baseName}_${Math.floor(Math.random() * 10000)}`;
          } else {
            username = this.generateUsernameFromEmail(oauthUser.email);
          }
        }

        const avatar = oauthUser.avatar || this.generateAvatarPlaceholder(username, oauthUser.displayName || username);

        // 🔥 NEW: Set emailVerified and isActive based on requireEmailVerification
        const emailVerified = !requireEmailVerification;
        const isActive = !requireEmailVerification;

        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: oauthUser.email,
            username,
            displayName: oauthUser.displayName || username,
            avatar,
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            emailVerified,
            isActive,
            role: 'USER',
            password: null,
          } as unknown as Prisma.UserUncheckedCreateInput,
        });

        if (requireEmailVerification) {
          this.logger.log(`New OAuth user created: ${user.email} (${user.id}) - Pending verification`);
          await this.sendEmailVerification(user.id, user.email, user.displayName || user.username);
        } else {
          this.logger.log(`New OAuth user created: ${user.email} (${user.id}) - Auto-activated (no verification required)`);
        }

        const { password: _, ...result } = user;
        return { user: result, needsVerification: requireEmailVerification, email: user.email };
      }
    }
  }

  private generateUsernameFromEmail(email: string): string {
    const baseUsername = email.split('@')[0];
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${baseUsername}_${randomSuffix}`;
  }

  async updateEmail(userId: string, newEmail: string) {
    // Check if email is already taken
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Check if current email is a placeholder
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User không tồn tại');
    }

    // Update email
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
      },
    });

    return {
      success: true,
      message: 'Cập nhật email thành công',
      data: {
        user: updatedUser,
      },
      timestamp: new Date().toISOString(),
    };
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

  async generateTokens(
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
    },
    rememberMe: boolean = false
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    // 🔥 FIXED: Access token expires in 1 hour (down from 7 days)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '1h', // 1 hour for better security
    });

    // 🔥 FIXED: Refresh token expires based on rememberMe
    // - rememberMe = true: 30 days
    // - rememberMe = false: 7 days
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTokenExpiry,
    });

    // 🔥 FIXED: Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    // Create a hash of refresh token for storage (don't store plain token)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    try {
      await (this.prisma as any).refreshToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt,
        },
      });

      this.logger.log(`Refresh token created for user: ${user.id} (expires: ${expiresAt.toISOString()})`);
    } catch (error) {
      this.logger.error(`Failed to store refresh token: ${error.message}`);
      // Continue anyway - token will still work but won't be in DB
    }

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 🔥 FIXED: Validate refresh token exists in database
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const storedToken = await (this.prisma as any).refreshToken.findUnique({
        where: { token: tokenHash },
        include: { user: true },
      });

      if (!storedToken) {
        this.logger.warn(`Refresh token not found in database: ${payload.sub}`);
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        this.logger.warn(`Expired refresh token used: ${payload.sub}`);
        // Clean up expired token
        await (this.prisma as any).refreshToken.delete({ where: { id: storedToken.id } });
        throw new UnauthorizedException('Refresh token đã hết hạn');
      }

      const user = storedToken.user;

      if (!user || !user.isActive) {
        this.logger.warn(`Refresh token for inactive/deleted user: ${payload.sub}`);
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
        expiresIn: '1h',
      });

      this.logger.log(`Access token refreshed for user: ${user.id}`);

      return { accessToken };
    } catch (error) {
      this.logger.error(`Refresh token error: ${error.message}`);
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

  // ===== Password Reset (quên mật khẩu) =====
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    // Luôn trả cùng một thông điệp — không tiết lộ email nào có đăng ký.
    const genericMessage =
      'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.';

    const normalizedEmail = email.trim();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!user) {
      this.logger.warn(`Forgot-password cho email không tồn tại: ${normalizedEmail}`);
      return { success: true, message: genericMessage };
    }

    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

      // Xoá token cũ của user này (chỉ giữ token mới nhất)
      await (this.prisma as any).passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      await (this.prisma as any).passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      await this.emailService.sendPasswordResetEmail(
        user.email,
        token,
        user.displayName || user.username,
      );

      this.logger.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      // Vẫn trả generic message — không lộ lỗi nội bộ cho client.
      this.logger.error(`Failed to send password reset email: ${error.message}`);
    }

    return { success: true, message: genericMessage };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const resetToken = await (this.prisma as any).passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new BadRequestException('Token không hợp lệ hoặc đã được sử dụng');
    }

    if (resetToken.expiresAt < new Date()) {
      await (this.prisma as any).passwordResetToken.delete({ where: { id: resetToken.id } });
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Xoá token đã dùng (one-time use)
    await (this.prisma as any).passwordResetToken.delete({ where: { id: resetToken.id } });

    // Vô hiệu hoá mọi phiên cũ — buộc đăng nhập lại bằng mật khẩu mới.
    try {
      await (this.prisma as any).refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      });
    } catch (error) {
      this.logger.error(`Failed to revoke refresh tokens after reset: ${error.message}`);
    }

    this.logger.log(`Password reset thành công cho user: ${resetToken.userId}`);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }

  async logout(userId: string): Promise<void> {
    // 🔥 FIXED: Invalidate all refresh tokens for this user
    try {
      const result = await (this.prisma as any).refreshToken.deleteMany({
        where: { userId },
      });
      this.logger.log(`Logged out user ${userId} - deleted ${result.count} refresh tokens`);
    } catch (error) {
      this.logger.error(`Failed to delete refresh tokens on logout: ${error.message}`);
    }
  }

  // Create one-time code for OAuth (iOS Safari compatible)
  async createOneTimeCode(userId: string): Promise<string> {
    // Generate random code
    const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Store code with 10 minutes expiration (increased from 5 for slow connections)
    await (this.prisma as any).oAuthCode.create({
      data: {
        code,
        userId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    return code;
  }

  // 🔥 UPDATED: Email Verification Methods
  async sendEmailVerification(userId: string, email: string, userName: string): Promise<void> {
    try {
      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Delete old tokens for this user
      await (this.prisma as any).emailVerificationToken.deleteMany({
        where: { userId },
      });

      // Store token in database
      await (this.prisma as any).emailVerificationToken.create({
        data: {
          userId,
          token,
          expiresAt,
        },
      });

      // Send email
      await this.emailService.sendVerificationEmail(email, token, userName);

      this.logger.log(`Email verification sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification: ${error.message}`);
      throw new BadRequestException('Không thể gửi email xác thực');
    }
  }

  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    try {
      // Find token
      const verificationToken = await (this.prisma as any).emailVerificationToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!verificationToken) {
        throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
      }

      // Check if expired
      if (verificationToken.expiresAt < new Date()) {
        await (this.prisma as any).emailVerificationToken.delete({ where: { id: verificationToken.id } });
        throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực');
      }

      // 🔥 UPDATE: Activate user account
      const user = await this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          isActive: true, // 🔥 Activate account
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          role: true,
        },
      });

      // Delete used token
      await (this.prisma as any).emailVerificationToken.delete({ where: { id: verificationToken.id } });

      this.logger.log(`Email verified and account activated: ${user.email} (${user.id})`);

      // 🔥 NEW: Send welcome email
      await this.emailService.sendWelcomeEmail(user.email, user.displayName || user.username);

      // 🔥 NEW: Auto-login user by generating tokens
      const tokens = await this.generateTokens(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        false // Don't remember by default
      );

      return {
        success: true,
        message: 'Xác thực email thành công! Tài khoản của bạn đã được kích hoạt.',
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
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`);
      throw error;
    }
  }

  async resendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User không tồn tại');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email đã được xác thực');
    }

    // Delete old tokens
    await (this.prisma as any).emailVerificationToken.deleteMany({
      where: { userId },
    });

    // Send new verification
    await this.sendEmailVerification(userId, user.email, user.displayName || user.username);
  }

  // Exchange one-time code for tokens
  async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find and validate code
    const oauthCode = await (this.prisma as any).oAuthCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!oauthCode) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (oauthCode.expiresAt < new Date()) {
      // Clean up expired code
      await (this.prisma as any).oAuthCode.delete({ where: { code } });
      throw new UnauthorizedException('Code has expired');
    }

    // 🔥 FIXED: Don't check isActive here - OAuth users can login even if not verified
    // They will be prompted to verify email after login
    // if (!oauthCode.user.isActive) {
    //   throw new UnauthorizedException('User account is inactive');
    // }

    // Generate tokens
    const tokens = await this.generateTokens({
      id: oauthCode.user.id,
      email: oauthCode.user.email,
      username: oauthCode.user.username,
      role: oauthCode.user.role,
    });

    // Delete used code (one-time use)
    await (this.prisma as any).oAuthCode.delete({ where: { code } });

    return tokens;
  }

  // Complete email with code (for Facebook OAuth users without email)
  async completeEmailWithCode(code: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find and validate code
    const oauthCode = await (this.prisma as any).oAuthCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!oauthCode) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (oauthCode.expiresAt < new Date()) {
      await (this.prisma as any).oAuthCode.delete({ where: { code } });
      throw new UnauthorizedException('Code has expired');
    }

    // 🔥 FIXED: Don't check isActive - allow OAuth users to complete email even if not verified
    // if (!oauthCode.user.isActive) {
    //   throw new UnauthorizedException('User account is inactive');
    // }

    // Update user email
    await this.updateEmail(oauthCode.user.id, email);

    // Generate tokens with new email
    const tokens = await this.generateTokens({
      id: oauthCode.user.id,
      email: email,
      username: oauthCode.user.username,
      role: oauthCode.user.role,
    });

    // Delete used code (one-time use)
    await (this.prisma as any).oAuthCode.delete({ where: { code } });

    return tokens;
  }
}
