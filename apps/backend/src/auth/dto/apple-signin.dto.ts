import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AppleFullNameDto {
  @IsOptional()
  @IsString()
  givenName?: string;

  @IsOptional()
  @IsString()
  familyName?: string;
}

/**
 * Body for POST /auth/apple/verify.
 *
 * `fullName` is ONLY provided by Apple on the user's first sign-in (the
 * mobile SDK must persist it locally and re-send for subsequent calls if
 * we haven't captured it yet). `identityToken` is a signed JWT we verify
 * against Apple's JWKS.
 */
export class AppleSignInDto {
  @IsNotEmpty()
  @IsString()
  identityToken!: string;

  @IsOptional()
  @IsObject()
  fullName?: AppleFullNameDto;
}
