import { IsEnum } from 'class-validator';
import { UgcReportStatus } from '@prisma/client';

export class UpdateReportDto {
  @IsEnum(UgcReportStatus)
  status!: UgcReportStatus;
}
