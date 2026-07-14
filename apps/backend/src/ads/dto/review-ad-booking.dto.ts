import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** DTO admin duyệt/từ chối đơn đặt quảng cáo. */
export class ReviewAdBookingDto {
    @IsIn(['APPROVED', 'REJECTED'])
    status: 'APPROVED' | 'REJECTED';

    /** Hướng dẫn thanh toán / lý do từ chối — hiển thị cho khách. */
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    adminNote?: string;
}
