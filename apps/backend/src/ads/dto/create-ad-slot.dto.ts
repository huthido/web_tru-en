import {
    IsString,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';
import { AdType, AdPosition, AdPlatform } from './create-ad.dto';

/**
 * DTO tạo AdSlot — slot là vị trí trên 1 route page mà admin có thể bật/tắt
 * và bind ads vào. Key phải duy nhất theo định dạng `pageKey.suffix`
 * (vd 'home.top', 'reading.inline') để frontend tham chiếu trực tiếp.
 */
export class CreateAdSlotDto {
    @IsString()
    @Matches(/^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/, {
        message: 'key phải dạng "pageKey.suffix" (vd home.top, reading.inline).',
    })
    @MaxLength(64)
    key: string;

    @IsString()
    @MaxLength(64)
    pageKey: string;

    @IsEnum(AdPosition)
    position: AdPosition;

    @IsString()
    @MaxLength(128)
    label: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxAds?: number;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsEnum(AdType)
    adType?: AdType;

    @IsOptional()
    @IsEnum(AdPlatform)
    platform?: AdPlatform;

    /** Giá thuê (VND/ngày) trên trang bảng giá /quang-cao. 0 = chưa niêm yết. */
    @IsOptional()
    @IsInt()
    @Min(0)
    pricePerDay?: number;

    /** Cho phép khách tự đặt slot này từ trang /quang-cao. */
    @IsOptional()
    @IsBoolean()
    isPublicForBooking?: boolean;

    /** Mô tả public: kích thước banner đề xuất, vị trí, lưu ý. */
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bookingNote?: string;
}
