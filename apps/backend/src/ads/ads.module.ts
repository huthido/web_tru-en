import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AnalyticsService } from './analytics.service';
import { AdsController } from './ads.controller';
import { AdSlotsService } from './ad-slots.service';
import { AdSlotsController } from './ad-slots.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [AdsController, AdSlotsController],
  providers: [AdsService, AnalyticsService, AdSlotsService],
  exports: [AdsService, AnalyticsService, AdSlotsService],
})
export class AdsModule { }

