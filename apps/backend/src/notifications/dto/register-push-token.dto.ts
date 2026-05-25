import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
    @IsString()
    @MaxLength(200)
    token!: string;

    @IsString()
    @IsIn(['ios', 'android', 'web'])
    platform!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    deviceId?: string;
}
