import { IsString, IsOptional, IsBoolean, IsEmail, IsUrl, ValidateIf, IsInt, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  siteDescription?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteLogo !== '' && o.siteLogo != null)
  @IsUrl()
  siteLogo?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteFavicon !== '' && o.siteFavicon != null)
  @IsUrl()
  siteFavicon?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteEmail !== '' && o.siteEmail != null)
  @IsEmail()
  siteEmail?: string;

  @IsOptional()
  @IsString()
  sitePhone?: string;

  @IsOptional()
  @IsString()
  siteAddress?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteFacebook !== '' && o.siteFacebook != null)
  @IsUrl()
  siteFacebook?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteTwitter !== '' && o.siteTwitter != null)
  @IsUrl()
  siteTwitter?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteYoutube !== '' && o.siteYoutube != null)
  @IsUrl()
  siteYoutube?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteInstagram !== '' && o.siteInstagram != null)
  @IsUrl()
  siteInstagram?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteX !== '' && o.siteX != null)
  @IsUrl()
  siteX?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteTikTok !== '' && o.siteTikTok != null)
  @IsUrl()
  siteTikTok?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteLinkedIn !== '' && o.siteLinkedIn != null)
  @IsUrl()
  siteLinkedIn?: string;

  @IsOptional()
  @ValidateIf((o) => o.siteThreads !== '' && o.siteThreads != null)
  @IsUrl()
  siteThreads?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  requireEmailVerification?: boolean;

  // Donation rev-share — % the platform keeps. 0 = author keeps 100%.
  // Capped at 50 to prevent admin from accidentally locking out authors.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  donationPlatformFeePercent?: number;

  // Chapter / VIP-story sale rev-share — separate from donation fee so admin
  // can tune them independently. Same bounds.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  chapterSaleFeePercent?: number;

  // Spec mục 2 — bật/tắt chuyển xu giữa user.
  @IsOptional()
  @IsBoolean()
  allowCoinTransfer?: boolean;

  // Spec mục 17 — số xu tối thiểu được rút.
  @IsOptional()
  @IsInt()
  @Min(0)
  minWithdrawalCoins?: number;
}
