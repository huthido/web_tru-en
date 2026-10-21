import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { RewardsCron } from './rewards.cron';

@Module({
    imports: [PrismaModule, WalletModule],
    controllers: [RewardsController],
    providers: [RewardsService, RewardsCron],
    exports: [RewardsService],
})
export class RewardsModule { }
