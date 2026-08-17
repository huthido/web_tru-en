import { IsString, IsInt, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

export class CreateHomepageSectionDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsString()
  sortPath: string;

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
