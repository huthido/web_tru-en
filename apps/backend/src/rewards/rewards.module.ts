import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { SponsorService } from './sponsor.service';
import { SponsorController } from './sponsor.controller';
import { RewardsCron } from './rewards.cron';

@Module({
    imports: [PrismaModule, WalletModule, NotificationsModule],
    controllers: [RewardsController, SponsorController],
    providers: [RewardsService, SponsorService, RewardsCron],
    exports: [RewardsService],
})
export class RewardsModule { }
