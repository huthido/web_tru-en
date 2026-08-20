import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TtsModule } from '../tts/tts.module';

@Module({
  // TtsModule: tự sinh audio AI cho chương được auto-publish khi duyệt truyện.
  imports: [PrismaModule, EmailModule, NotificationsModule, TtsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}

