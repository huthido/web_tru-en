import { IsArray, IsString, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderItemDto {
  @IsString()
  id: string;

  @IsInt()
  order: number;
}

export class ReorderHomepageSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
