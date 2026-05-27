import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminMonetizationController,
  MonetizationController,
} from './monetization.controller';
import { MonetizationService } from './monetization.service';

@Module({
  imports: [PrismaModule],
  controllers: [MonetizationController, AdminMonetizationController],
  providers: [MonetizationService],
  exports: [MonetizationService],
})
export class MonetizationModule {}
