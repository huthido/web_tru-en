import {
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsInt,
    Min,
    IsArray,
    IsBoolean,
} from 'class-validator';

export class UpdateChapterDto {
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Tiêu đề chương không được để trống' })
    @MaxLength(200, { message: 'Tiêu đề chương không được quá 200 ký tự' })
    title?: string;

    @IsOptional()
    @IsString()
    @MinLength(100, { message: 'Nội dung chương phải có ít nhất 100 ký tự' })
    content?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;
}

