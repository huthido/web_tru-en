import {
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsInt,
    Min,
    IsArray,
    IsUrl,
} from 'class-validator';

export class CreateChapterDto {
    @IsString()
    @MinLength(1, { message: 'Tiêu đề chương không được để trống' })
    @MaxLength(200, { message: 'Tiêu đề chương không được quá 200 ký tự' })
    title: string;

    @IsString()
    @MinLength(100, { message: 'Nội dung chương phải có ít nhất 100 ký tự' })
    content: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    order?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    // Coin price to unlock this chapter. 0 (default) = free.
    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;

    // URL audio (từ /chapters/upload-audio) — nghe thay vì đọc.
    @IsOptional()
    @IsUrl({ require_tld: false }, { message: 'audioUrl không hợp lệ' })
    @MaxLength(1000)
    audioUrl?: string;
}

