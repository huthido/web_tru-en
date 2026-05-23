import { IsOptional, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class StoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  // Accept either ?categories[]=a&categories[]=b (array form) or
  // ?categories=a,b (comma-separated string from clients that don't bracket-
  // serialise arrays, e.g. mobile axios with a single value).
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'newest' | 'popular' | 'rating' | 'viewCount' = 'newest';

  @IsOptional()
  @IsString()
  country?: string;
}

