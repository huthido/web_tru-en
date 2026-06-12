import { IsString, IsOptional, IsInt, IsPositive, MaxLength } from 'class-validator';

export class CreateArtPostDto {
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  height?: number;
}
