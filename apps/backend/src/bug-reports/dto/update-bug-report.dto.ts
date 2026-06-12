import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BugReportStatus, BugSeverity } from '@prisma/client';

export class UpdateBugReportDto {
  @IsOptional()
  @IsEnum(BugReportStatus)
  status?: BugReportStatus;

  @IsOptional()
  @IsEnum(BugSeverity)
  severity?: BugSeverity;

  /** Ghi chú xử lý — admin hoặc AI agent ghi nguyên nhân / cách fix. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNote?: string;
}
