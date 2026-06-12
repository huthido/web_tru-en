import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { BugPlatform, BugSeverity } from '@prisma/client';

export class CreateBugReportDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsEnum(BugPlatform)
  platform?: BugPlatform;

  @IsOptional()
  @IsEnum(BugSeverity)
  severity?: BugSeverity;

  /** URL trang web hoặc tên màn hình mobile nơi gặp lỗi. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  /** userAgent (web) hoặc model máy + OS version (mobile). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}
