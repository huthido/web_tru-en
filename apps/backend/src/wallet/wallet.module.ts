import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinPackageService } from './coin-package.service';
import { AdminCoinPackageController } from './admin-coin-package.controller';

@Module({
    imports: [PrismaModule],
    controllers: [WalletController, AdminCoinPackageController],
    providers: [WalletService, CoinPackageService],
    exports: [WalletService, CoinPackageService],
})
export class WalletModule { }
