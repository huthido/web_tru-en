import { IsString, MinLength, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email hoặc username là bắt buộc' })
  @IsString()
  emailOrUsername: string;

  @IsString()
  @MinLength(1, { message: 'Mật khẩu là bắt buộc' })
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

