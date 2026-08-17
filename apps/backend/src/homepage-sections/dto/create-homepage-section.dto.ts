import { IsString, IsInt, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

const ALGORITHMS = ['newest', 'best-of-month', 'best-of-week', 'top-rated', 'recommended', 'most-liked', 'most-followed', 'most-viewed', 'premium-stories', 'random'] as const;

export class CreateHomepageSectionDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsString()
  sortPath: string = 'newest';

  @IsString()
  @IsIn(ALGORITHMS as unknown as string[])
  @IsOptional()
  algorithm?: string = 'newest';

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 15;

  @IsString()
  @IsOptional()
  seeMorePath?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsIn(['auto', 'manual'])
  @IsOptional()
  mode?: string = 'auto';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
