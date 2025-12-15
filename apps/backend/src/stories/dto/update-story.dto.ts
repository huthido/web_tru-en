import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsUrl,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { StoryStatus } from '@prisma/client';

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Tiêu đề phải có ít nhất 3 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được quá 200 ký tự' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Mô tả không được quá 5000 ký tự' })
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Ảnh bìa phải là URL hợp lệ' })
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
  @IsEnum(StoryStatus)
  status?: StoryStatus;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  country?: string;
}

