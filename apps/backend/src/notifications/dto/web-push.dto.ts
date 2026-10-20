import { Type } from 'class-transformer';
import { IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

class WebPushKeysDto {
    @IsString()
    @MaxLength(200)
    p256dh!: string;

    @IsString()
    @MaxLength(100)
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
}

export class WebPushUnsubscribeDto {
    @IsString()
    @MaxLength(1000)
    endpoint!: string;
}
