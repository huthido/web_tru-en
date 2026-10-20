import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';
import { WebPushService } from './web-push.service';
import { NotificationsCron } from './notifications.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [PrismaModule, EmailModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, PushService, WebPushService, NotificationsCron],
    exports: [NotificationsService, PushService, WebPushService],
})
export class NotificationsModule {}
