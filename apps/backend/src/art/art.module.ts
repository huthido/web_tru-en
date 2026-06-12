import { Module } from '@nestjs/common';
import { ArtController } from './art.controller';
import { ArtService } from './art.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ArtController],
  providers: [ArtService],
  exports: [ArtService],
})
export class ArtModule {}
