import { IsOptional, IsString, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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

