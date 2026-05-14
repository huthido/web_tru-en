import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { VnpayProvider } from './providers/vnpay.provider';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, VnpayProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
