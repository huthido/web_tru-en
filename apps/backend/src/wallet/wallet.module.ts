import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinPackageService } from './coin-package.service';
import { AdminCoinPackageController } from './admin-coin-package.controller';
import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [PrismaModule, forwardRef(() => SettingsModule)],
    controllers: [WalletController, AdminCoinPackageController, AdminWithdrawalController, AdminWalletController],
    providers: [WalletService, CoinPackageService],
    exports: [WalletService, CoinPackageService],
})
export class WalletModule { }
