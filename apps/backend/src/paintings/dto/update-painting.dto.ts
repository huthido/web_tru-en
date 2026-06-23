import { PartialType } from '@nestjs/mapped-types';
import { CreatePaintingDto } from './create-painting.dto';

export class UpdatePaintingDto extends PartialType(CreatePaintingDto) {}
