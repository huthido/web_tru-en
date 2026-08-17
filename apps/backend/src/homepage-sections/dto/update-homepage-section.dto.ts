import { IsString, IsInt, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

const ALGORITHMS = ['newest', 'best-of-month', 'top-rated', 'recommended', 'most-liked', 'most-followed', 'most-viewed', 'random'] as const;

export class UpdateHomepageSectionDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  sortPath?: string;

  @IsString()
  @IsIn(ALGORITHMS as unknown as string[])
  @IsOptional()
  algorithm?: string;

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
