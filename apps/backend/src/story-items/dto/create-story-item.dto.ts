import { IsString, IsOptional, IsInt, Min, Max, IsBoolean, IsUrl, ValidateIf, MaxLength } from 'class-validator';

export class CreateStoryItemDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ValidateIf((o) => o.imageUrl !== '' && o.imageUrl != null)
  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @ValidateIf((o) => o.fileUrl !== '' && o.fileUrl != null)
  @IsUrl()
  fileUrl?: string;

  // Giá xu mỗi lần mua.
  @IsInt()
  @Min(1)
  @Max(100000000)
  price: number;

  // Tồn kho tối đa; bỏ trống = không giới hạn.
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
