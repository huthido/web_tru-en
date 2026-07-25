import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên hiển thị không được quá 100 ký tự' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio không được quá 500 ký tự' })
  bio?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Avatar phải là một URL hợp lệ' })
  avatar?: string;

  // Slug tuỳ chỉnh cho URL chia sẻ /u/[slug]. Chuỗi rỗng = xoá slug (dùng lại
  // username). Định dạng/trùng lặp được validate kỹ ở service để có thông báo rõ.
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Đường dẫn chia sẻ không được quá 30 ký tự' })
  profileSlug?: string;
}

