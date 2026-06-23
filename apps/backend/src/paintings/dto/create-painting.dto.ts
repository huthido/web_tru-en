import { IsString, IsOptional, IsInt, IsObject, MinLength, MaxLength, Min } from 'class-validator';

export class ContactInfoDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  zalo?: string;

  @IsOptional()
  @IsString()
  facebook?: string;
}

export class CreatePaintingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsObject()
  contactInfo?: ContactInfoDto;
}
