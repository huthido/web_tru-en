import { Module, forwardRef } from '@nestjs/common';
import { ChaptersController, AdminChaptersController, ChapterUploadController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { WalletModule } from '../wallet/wallet.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    forwardRef(() => ApprovalsModule),
    WalletModule,
  ],
  controllers: [ChaptersController, AdminChaptersController, ChapterUploadController],
  providers: [ChaptersService],
  exports: [ChaptersService],
})
export class ChaptersModule { }

