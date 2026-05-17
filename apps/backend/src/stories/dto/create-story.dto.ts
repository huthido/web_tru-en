import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { StoryAccessType } from '@prisma/client';

export class CreateStoryDto {
  @IsString()
  @MinLength(3, { message: 'Tiêu đề phải có ít nhất 3 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Mô tả không được quá 5000 ký tự' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Ảnh bìa phải là chuỗi hợp lệ' })
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  country?: string;

  // Spec mục 4. Default FREE nếu không truyền.
  @IsOptional()
  @IsEnum(StoryAccessType)
  accessType?: StoryAccessType;

  // Giá coin mở khóa cả truyện khi accessType=VIP. 0 = không bán.
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}

