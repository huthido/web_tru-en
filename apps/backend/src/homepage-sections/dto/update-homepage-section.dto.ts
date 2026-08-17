import { IsString, IsInt, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

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

  @IsString()
  @IsIn(['auto', 'manual'])
  @IsOptional()
  mode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
