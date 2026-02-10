import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID') || 'MISSING_APP_ID',
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET') || 'MISSING_APP_SECRET',
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || '/api/auth/facebook/callback',
      scope: 'email', // Request email permission
      profileFields: ['emails', 'name', 'picture', 'id'], // Include id for fallback
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
  ): Promise<any> {
    try {
      const { id, name, emails, photos, username } = profile;

      // Handle case where email is not available
      let email = emails?.[0]?.value;
      let needsEmail = false;

      if (!email) {
        email = `facebook_${id}@facebook.placeholder`;
        needsEmail = true;
        this.logger.warn(`Facebook user ${id} does not have email. Using placeholder.`);
      }

      const displayName = `${name?.givenName || ''} ${name?.familyName || ''}`.trim() ||
        username ||
        `Facebook User ${id}`;

      this.logger.log(`Facebook OAuth: User ${email} (${id})`);

      const user = {
        provider: 'facebook',
        providerId: id,
        email: email,
        displayName: displayName,
        avatar: photos?.[0]?.value,
        accessToken,
        needsEmail,
      };

      const result = await this.authService.validateOAuthUser(user);

      this.logger.log(`Facebook OAuth result: ${JSON.stringify({
        email: result.email || result.user?.email,
        needsVerification: result.needsVerification
      })}`);

      done(null, result);
    } catch (error) {
      this.logger.error(`Facebook OAuth validation error: ${error.message}`, error.stack);
      done(error, null);
    }
  }
}

