import { Module, forwardRef } from '@nestjs/common';
import { ChaptersController, AdminChaptersController, ChapterUploadController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { ChaptersCron } from './chapters.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { WalletModule } from '../wallet/wallet.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonetizationModule } from '../monetization/monetization.module';
import { TtsModule } from '../tts/tts.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    forwardRef(() => ApprovalsModule),
    WalletModule,
    NotificationsModule,
    MonetizationModule,
    // Tự sinh audio AI khi chương được xuất bản.
    TtsModule,
  ],
  controllers: [ChaptersController, AdminChaptersController, ChapterUploadController],
  providers: [ChaptersService, ChaptersCron],
  exports: [ChaptersService],
})
export class ChaptersModule { }

