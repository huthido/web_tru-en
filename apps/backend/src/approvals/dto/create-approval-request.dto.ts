import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApprovalType } from '@prisma/client';

export class CreateApprovalRequestDto {
    @IsEnum(ApprovalType)
    type: ApprovalType;

    @IsOptional()
    @IsString()
    @MaxLength(1000, { message: 'Tin nhắn không được quá 1000 ký tự' })
    message?: string;
}

