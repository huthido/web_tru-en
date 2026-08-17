import { Module } from '@nestjs/common';
import { HomepageSectionsService } from './homepage-sections.service';
import { HomepageSectionsController } from './homepage-sections.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HomepageSectionsController],
  providers: [HomepageSectionsService],
  exports: [HomepageSectionsService],
})
export class HomepageSectionsModule {}
