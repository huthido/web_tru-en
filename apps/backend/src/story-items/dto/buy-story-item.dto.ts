import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class BuyStoryItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number;
}
