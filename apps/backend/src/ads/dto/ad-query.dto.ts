import { IsOptional, IsEnum, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { AdType, AdPosition } from './create-ad.dto';
import { Transform, Type } from 'class-transformer';

export class AdQueryDto {
  @IsOptional()
  @IsEnum(AdType)
  type?: AdType;

  @IsOptional()
  @IsEnum(AdPosition)
  position?: AdPosition;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

