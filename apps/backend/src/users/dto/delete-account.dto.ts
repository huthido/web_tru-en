import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  /**
   * Mật khẩu hiện tại. Bắt buộc nếu tài khoản có password (đăng nhập local).
   * OAuth-only (Google/Facebook chưa đặt password) thì không cần truyền.
   */
  @IsOptional()
  @IsString()
  password?: string;
}
