import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { VnpayProvider } from './providers/vnpay.provider';
import { AppleIapProvider } from './providers/apple-iap.provider';
import { GooglePlayProvider } from './providers/google-play.provider';

@Module({
  imports: [PrismaModule, WalletModule, NotificationsModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, VnpayProvider, AppleIapProvider, GooglePlayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
