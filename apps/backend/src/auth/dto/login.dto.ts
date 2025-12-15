import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email hoặc username là bắt buộc' })
  @IsString()
  emailOrUsername: string;

  @IsString()
  @MinLength(1, { message: 'Mật khẩu là bắt buộc' })
  password: string;
}

