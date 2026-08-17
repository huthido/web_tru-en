import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateHomepageSectionDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  sortPath?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  seeMorePath?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
