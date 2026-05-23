import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
// jwks-rsa v4 export CJS thuần (module.exports = function). tsconfig backend
// chưa bật esModuleInterop, nên `import x from 'jwks-rsa'` compile sai → runtime
// `jwks_rsa_1.default is not a function`. Dùng TS import-require, biên dịch
// thẳng thành `const jwksClient = require('jwks-rsa')` — vẫn giữ types qua
// namespace merge (jwksClient.JwksClient).
import jwksClient = require('jwks-rsa');

/**
 * Sign in with Apple verifier. NOT a passport strategy — the mobile app
 * obtains an `identityToken` from `expo-apple-authentication` and POSTs it
 * to `/auth/apple/verify`. This service validates the JWT against Apple's
 * published JWKS and returns the canonical user fields the auth service
 * needs to find-or-create a User.
 *
 * Apple's identityToken claims:
 *   iss = https://appleid.apple.com
 *   aud = client_id (Services ID for web, bundle id for native iOS)
 *   sub = stable Apple user id (per app, never changes)
 *   email = only delivered on FIRST sign-in (may be private-relay
 *           xxxxx@privaterelay.appleid.com)
 *   email_verified = "true" (string) on first sign-in
 */
@Injectable()
export class AppleSignInStrategy {
  private readonly logger = new Logger(AppleSignInStrategy.name);
  private readonly clientId: string;
  private readonly client: jwksClient.JwksClient;

  constructor(private config: ConfigService) {
    this.clientId = this.config.get<string>('APPLE_OAUTH_CLIENT_ID') || '';
    this.client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000, // 10 min
      rateLimit: true,
    });
  }

  isConfigured(): boolean {
    return !!this.clientId;
  }

  private getKey = (header: jwt.JwtHeader, cb: (err: Error | null, key?: string) => void) => {
    if (!header.kid) return cb(new Error('Apple JWT missing kid'));
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) return cb(err);
      cb(null, key?.getPublicKey());
    });
  };

  /**
   * Verify Apple's identityToken. Returns the canonical claims on success;
   * throws UnauthorizedException on any signature / claim mismatch.
   */
  async verifyIdentityToken(identityToken: string): Promise<{
    sub: string;
    email?: string;
    emailVerified: boolean;
    isPrivateEmail: boolean;
  }> {
    if (!this.isConfigured()) {
      throw new UnauthorizedException(
        'Sign in with Apple chưa được cấu hình trên server (APPLE_OAUTH_CLIENT_ID thiếu).',
      );
    }
    const payload: any = await new Promise((resolve, reject) => {
      jwt.verify(
        identityToken,
        this.getKey,
        {
          algorithms: ['RS256'],
          issuer: 'https://appleid.apple.com',
          audience: this.clientId,
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        },
      );
    }).catch((e: any) => {
      this.logger.warn(`Apple JWT verify failed: ${e?.message ?? e}`);
      throw new UnauthorizedException(`Apple sign-in token không hợp lệ: ${e?.message ?? e}`);
    });

    if (!payload?.sub) {
      throw new UnauthorizedException('Apple token thiếu sub');
    }
    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email) : undefined,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      isPrivateEmail: payload.is_private_email === true || payload.is_private_email === 'true',
    };
  }
}
