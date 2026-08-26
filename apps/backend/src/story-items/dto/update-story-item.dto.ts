import { IsString, IsOptional, IsInt, Min, Max, IsBoolean, IsUrl, ValidateIf, MaxLength } from 'class-validator';

/** Cập nhật vật phẩm — mọi field tuỳ chọn. `stock: null` = bỏ giới hạn tồn kho. */
export class UpdateStoryItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @ValidateIf((o) => o.imageUrl !== '' && o.imageUrl != null)
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @ValidateIf((o) => o.fileUrl !== '' && o.fileUrl != null)
  @IsUrl()
  fileUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000000)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
