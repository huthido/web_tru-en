import { Module } from '@nestjs/common';
import { StoryItemsController } from './story-items.controller';
import { StoryItemsService } from './story-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, WalletModule, CloudinaryModule],
  controllers: [StoryItemsController],
  providers: [StoryItemsService],
})
export class StoryItemsModule {}
