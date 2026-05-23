import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UgcReportTargetType } from '@prisma/client';

export class CreateReportDto {
  @IsEnum(UgcReportTargetType)
  targetType!: UgcReportTargetType;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  targetId!: string;

  /** Mã ngắn — SPAM | ABUSE | ILLEGAL | SEXUAL | HATE | COPYRIGHT | OTHER */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
