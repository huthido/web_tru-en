import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên thể loại phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Tên thể loại không được quá 50 ký tự' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Mô tả không được quá 500 ký tự' })
  description?: string;
}

