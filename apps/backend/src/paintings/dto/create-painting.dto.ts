import { IsString, IsOptional, IsInt, IsObject, IsUrl, MinLength, MaxLength, Min } from 'class-validator';

export class ContactInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  zalo?: string; // số điện thoại hoặc link zalo.me — sanitized on render

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
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
