import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { ImagesCompatController } from './images-compat.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ImagesCompatController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule { }

