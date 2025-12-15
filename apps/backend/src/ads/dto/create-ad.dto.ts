import { IsString, IsUrl, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';

export enum AdType {
    POPUP = 'POPUP',
    BANNER = 'BANNER',
    SIDEBAR = 'SIDEBAR',
}

export enum AdPosition {
    TOP = 'TOP',
    BOTTOM = 'BOTTOM',
    SIDEBAR_LEFT = 'SIDEBAR_LEFT',
    SIDEBAR_RIGHT = 'SIDEBAR_RIGHT',
    INLINE = 'INLINE',
}

export class CreateAdDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @IsUrl()
    imageUrl: string;

    @IsOptional()
    @IsUrl()
    linkUrl?: string;

    @IsEnum(AdType)
    type: AdType;

    @IsEnum(AdPosition)
    position: AdPosition;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
