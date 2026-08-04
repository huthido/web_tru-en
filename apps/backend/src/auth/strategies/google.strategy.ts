import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * Ghép tên hiển thị từ profile Google.
 *
 * Trước đây là `name.givenName + ' ' + name.familyName`. Rất nhiều tài khoản
 * Google chỉ có một phần tên, khi đó `familyName` là `undefined` và phép cộng
 * chuỗi sinh ra tên kiểu `"TunaPiece undefined"` — tên này được lưu vào
 * `user.displayName`, rồi chép sang `story.authorName` và lộ ra API công khai.
 */
function buildDisplayName(
  name: { givenName?: string; familyName?: string } | undefined,
  profileDisplayName: string | undefined,
  email: string | undefined
): string {
  const joined = [name?.givenName, name?.familyName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');

  if (joined) return joined;
  if (profileDisplayName?.trim()) return profileDisplayName.trim();
  return email?.split('@')[0] || 'Người dùng';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'MISSING_CLIENT_ID',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'MISSING_CLIENT_SECRET',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;
      const email = emails?.[0]?.value;

      this.logger.log(`Google OAuth: User ${email} (${id})`);

      const user = {
        provider: 'google',
        providerId: id,
        email,
        displayName: buildDisplayName(name, profile.displayName, email),
        avatar: photos?.[0]?.value,
        accessToken,
      };

      const result = await this.authService.validateOAuthUser(user);

      this.logger.log(`Google OAuth result: ${JSON.stringify({
        email: result.email || result.user?.email,
        needsVerification: result.needsVerification
      })}`);

      done(null, result);
    } catch (error) {
      this.logger.error(`Google OAuth validation error: ${error.message}`, error.stack);
      done(error, undefined);
    }
  }
}

