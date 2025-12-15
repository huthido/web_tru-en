import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApprovalStatus } from '@prisma/client';

export class ReviewApprovalDto {
    @IsEnum(ApprovalStatus)
    status: ApprovalStatus;

    @IsOptional()
    @IsString()
    @MaxLength(1000, { message: 'Ghi chú không được quá 1000 ký tự' })
    adminNote?: string;
}

