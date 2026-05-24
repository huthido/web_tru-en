import {
    IsString,
    IsUrl,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsDateString,
    ValidateIf,
    IsObject,
    IsInt,
    Min,
} from 'class-validator';

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

export enum AdSourceType {
    SELF_SERVED = 'SELF_SERVED',
    GOOGLE_ADSENSE = 'GOOGLE_ADSENSE',
    GOOGLE_ADMOB = 'GOOGLE_ADMOB',
    FAN = 'FAN',
    CUSTOM_SCRIPT = 'CUSTOM_SCRIPT',
}

export enum AdPlatform {
    WEB = 'web',
    MOBILE = 'mobile',
    ALL = 'all',
}

/**
 * Cấu hình network-specific. Service validate shape theo sourceType:
 * - GOOGLE_ADSENSE: { adUnitId, format?, responsive? }
 * - GOOGLE_ADMOB:   { adUnitId, format? }
 * - FAN:            { placementId }
 * - CUSTOM_SCRIPT:  { html }
 * - SELF_SERVED:    không cần
 */
export class CreateAdDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    // imageUrl chỉ bắt buộc khi SELF_SERVED. Validator class-validator chưa hỗ trợ
    // cross-field tốt — service sẽ throw BadRequest nếu thiếu cho self-served.
    @IsOptional()
    @ValidateIf((o) => !!o.imageUrl && o.imageUrl !== '')
    @IsUrl()
    imageUrl?: string;

    @IsOptional()
    @ValidateIf((o) => !!o.linkUrl && o.linkUrl !== '')
    @IsUrl()
    linkUrl?: string;

    @IsEnum(AdType)
    type: AdType;

    @IsEnum(AdPosition)
    position: AdPosition;

    @IsOptional()
    @IsEnum(AdSourceType)
    sourceType?: AdSourceType;

    @IsOptional()
    @IsObject()
    networkConfig?: Record<string, any>;

    @IsOptional()
    @IsEnum(AdPlatform)
    platform?: AdPlatform;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    popupInterval?: number; // Number of chapters to read before showing popup (only for POPUP type)
}
