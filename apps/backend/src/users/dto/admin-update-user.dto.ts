import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AdminUpdateUserDto {
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    displayName?: string;

    @IsOptional()
    @IsString()
    bio?: string;
}

