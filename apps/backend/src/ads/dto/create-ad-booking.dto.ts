import {
    IsDateString,
    IsEmail,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

/**
 * DTO khách gửi đơn đặt quảng cáo từ trang /quang-cao.
 * Giá KHÔNG nhận từ client — server tính lại từ slot.pricePerDay × số ngày.
 */
export class CreateAdBookingDto {
    @IsString()
    slotId: string;

    /** Ngày bắt đầu chạy (YYYY-MM-DD). */
    @IsDateString()
    startDate: string;

    /** Ngày kết thúc chạy (YYYY-MM-DD, tính trọn ngày). */
    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsString()
    @MaxLength(160)
    title?: string;

    /**
     * Ảnh banner (upload trước qua /ad-bookings/upload-image).
     * Bắt buộc http(s) — giá trị này được copy vào Ad render công khai.
     */
    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(1000)
    imageUrl?: string;

    /**
     * Link đích khi click quảng cáo. Bắt buộc http(s) — chặn stored XSS
     * kiểu `javascript:` vì URL này thành href thẻ <a> công khai.
     */
    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(1000)
    linkUrl?: string;

    @IsString()
    @MaxLength(128)
    contactName: string;

    @IsString()
    @MaxLength(32)
    contactPhone: string;

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    companyName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}
