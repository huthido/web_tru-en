import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, WithdrawalStatus, User } from '@prisma/client';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWithdrawalController {
    constructor(private readonly walletService: WalletService) { }

    @Get()
    list(@Query('status') status?: string) {
        const valid =
            status && (Object.values(WithdrawalStatus) as string[]).includes(status)
                ? (status as WithdrawalStatus)
                : undefined;
        return this.walletService.listWithdrawals(valid);
    }

    @Patch(':id')
    process(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { action: 'APPROVE' | 'REJECT'; note?: string },
    ) {
        if (body.action !== 'APPROVE' && body.action !== 'REJECT') {
            throw new BadRequestException('action phải là APPROVE hoặc REJECT');
        }
        const admin = req.user as User;
        return this.walletService.processWithdrawal(admin.id, id, body.action, body.note);
    }
}
