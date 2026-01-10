import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
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

      this.logger.log(`Google OAuth: User ${emails[0].value} (${id})`);

      const user = {
        provider: 'google',
        providerId: id,
        email: emails[0].value,
        displayName: name.givenName + ' ' + name.familyName,
        avatar: photos[0].value,
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

