import { Module, forwardRef } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SearchModule } from '../search/search.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, forwardRef(() => SearchModule), WalletModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule { }

