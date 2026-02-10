import { PartialType } from '@nestjs/mapped-types';
import { CreateCoinPackageDto } from './create-coin-package.dto';

export class UpdateCoinPackageDto extends PartialType(CreateCoinPackageDto) { }
