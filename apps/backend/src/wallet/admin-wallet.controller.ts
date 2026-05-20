import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Request,
    UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get(':userId')
    get(@Param('userId') userId: string) {
        return this.walletService.getWalletByUserId(userId);
    }

    @Patch(':userId/lock')
    setLock(@Param('userId') userId: string, @Body() body: { locked: boolean }) {
        return this.walletService.setWalletLock(userId, !!body.locked);
    }

    @Patch(':userId/adjust')
    adjust(
        @Request() req: any,
        @Param('userId') userId: string,
        @Body() body: { bucket: 'PURCHASED' | 'EARNED'; delta: number; note: string },
    ) {
        return this.walletService.adminAdjustWallet(req.user.id, userId, body);
    }
}
