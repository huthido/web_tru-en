import { PartialType } from '@nestjs/mapped-types';
import { CreateAdSlotDto } from './create-ad-slot.dto';

export class UpdateAdSlotDto extends PartialType(CreateAdSlotDto) {}
