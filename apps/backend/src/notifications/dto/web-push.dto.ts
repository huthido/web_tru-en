import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateNested } from 'class-validator';

/** Khoá base64url của PushSubscription: p256dh = 65 byte (~87 ký tự), auth = 16 byte (~22 ký tự). */
class WebPushKeysDto {
    @IsString()
    @Matches(/^[A-Za-z0-9_-]{80,100}={0,2}$/, { message: 'p256dh không hợp lệ' })
    p256dh!: string;

    @IsString()
    @Matches(/^[A-Za-z0-9_-]{20,30}={0,2}$/, { message: 'auth không hợp lệ' })
    auth!: string;
}

/** Đúng định dạng PushSubscription.toJSON() của trình duyệt. */
export class WebPushSubscribeDto {
    @IsUrl({ protocols: ['https'], require_protocol: true })
    @MaxLength(1000)
    endpoint!: string;

    @ValidateNested()
    @Type(() => WebPushKeysDto)
    keys!: WebPushKeysDto;

    /** Chrome/Firefox luôn gửi kèm trong toJSON() (thường là null) — không dùng,
     *  nhưng phải khai báo vì ValidationPipe bật forbidNonWhitelisted. */
    @IsOptional()
    @IsNumber()
    expirationTime?: number | null;
}

export class WebPushUnsubscribeDto {
    @IsString()
    @MaxLength(1000)
    endpoint!: string;
}
