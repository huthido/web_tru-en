import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * Tạo mật khẩu lần đầu cho tài khoản OAuth (Google) chưa có mật khẩu.
 * Không cần currentPassword — backend chỉ cho phép khi password == null.
 */
export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(100, { message: 'Mật khẩu mới không được quá 100 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  newPassword: string;

  @IsString()
  confirmNewPassword: string;
}
