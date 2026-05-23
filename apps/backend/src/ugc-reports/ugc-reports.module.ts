import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminUgcReportsController,
  UgcReportsController,
} from './ugc-reports.controller';
import { UgcReportsService } from './ugc-reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [UgcReportsController, AdminUgcReportsController],
  providers: [UgcReportsService],
})
export class UgcReportsModule {}
