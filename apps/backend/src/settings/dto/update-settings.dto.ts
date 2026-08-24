import { IsString, IsOptional, IsBoolean, IsEmail, IsUrl, ValidateIf, IsInt, Min, Max, IsArray } from 'class-validator';

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

  // Cho phép độc giả tải xuống file audio chương (audio tác giả + audio AI).
  @IsOptional()
  @IsBoolean()
  chapterAudioDownloadEnabled?: boolean;

  // Chống copy nội dung chương trên trang đọc (chặn mềm phía client).
  @IsOptional()
  @IsBoolean()
  copyProtectionEnabled?: boolean;

  // Spec mục 17 — số xu tối thiểu được rút.
  @IsOptional()
  @IsInt()
  @Min(0)
  minWithdrawalCoins?: number;

  // Giọng đọc AI: tự sinh audio khi chương xuất bản (mặc định tắt).
  @IsOptional()
  @IsBoolean()
  ttsAutoGenerateOnPublish?: boolean;

  // Giọng đọc AI: phí gói tháng (xu / 30 ngày) tác giả mua để tự tạo audio
  // không giới hạn chương (0 = miễn phí cho mọi tác giả).
  @IsOptional()
  @IsInt()
  @Min(0)
  ttsSubscriptionCoinCost?: number;

  // --- Cấu hình quảng cáo (3rd-party) ---
  @IsOptional()
  @IsBoolean()
  adsEnabled?: boolean;

  @IsOptional()
  @IsString()
  googleAdsensePublisherId?: string;

  @IsOptional()
  @IsString()
  admobAndroidAppId?: string;

  @IsOptional()
  @IsString()
  admobIosAppId?: string;

  @IsOptional()
  @IsString()
  fanPlacementId?: string;

  @IsOptional()
  @IsString()
  adsTxtContent?: string;

  @IsOptional()
  @IsBoolean()
  consentRequired?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedImageDomains?: string[];

  // --- Thanh toán thủ công (chuyển khoản, admin xác nhận tay) ---
  @IsOptional()
  @IsBoolean()
  manualPaymentEnabled?: boolean;

  @IsOptional()
  @IsString()
  manualPaymentBankBin?: string;

  @IsOptional()
  @IsString()
  manualPaymentBankName?: string;

  @IsOptional()
  @IsString()
  manualPaymentAccountNumber?: string;

  @IsOptional()
  @IsString()
  manualPaymentAccountHolder?: string;

  @IsOptional()
  @IsString()
  manualPaymentInstructions?: string;
}
