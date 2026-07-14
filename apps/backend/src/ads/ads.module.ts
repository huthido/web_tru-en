import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AnalyticsService } from './analytics.service';
import { AdsController } from './ads.controller';
import { AdSlotsService } from './ad-slots.service';
import { AdSlotsController } from './ad-slots.controller';
import { AdBookingsService } from './ad-bookings.service';
import { AdBookingsController } from './ad-bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [AdsController, AdSlotsController, AdBookingsController],
  providers: [AdsService, AnalyticsService, AdSlotsService, AdBookingsService],
  exports: [AdsService, AnalyticsService, AdSlotsService, AdBookingsService],
})
export class AdsModule { }

