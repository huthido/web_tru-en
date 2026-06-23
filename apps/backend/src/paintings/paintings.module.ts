import { Module } from '@nestjs/common';
import { PaintingsController } from './paintings.controller';
import { PaintingsService } from './paintings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [PaintingsController],
  providers: [PaintingsService],
  exports: [PaintingsService],
})
export class PaintingsModule {}
