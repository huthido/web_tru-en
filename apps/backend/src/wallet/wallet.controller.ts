import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

@Controller('wallet')
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get('balance')
    @UseGuards(JwtAuthGuard)
    async getBalance(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getBalance(user.id);
    }

    @Get('history')
    @UseGuards(JwtAuthGuard)
    async getHistory(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getTransactionHistory(user.id);
    }

    // Mock deposit for testing
    @Post('deposit')
    @UseGuards(JwtAuthGuard)
    async deposit(@Request() req: any, @Body() body: { amount: number }) {
        const user = req.user as User;
        return this.walletService.deposit(user.id, body.amount, 'User Manual Deposit');
    }

    // Donate coins to an author
    @Post('donate')
    @UseGuards(JwtAuthGuard)
    async donateToAuthor(
        @Request() req: any,
        @Body() body: { authorId: string; storyId?: string; amount: number; message?: string },
    ) {
        const user = req.user as User;
        return this.walletService.donateToAuthor(user.id, body.authorId, body.amount, body.storyId, body.message);
    }

    // Get author donation stats (public)
    @Get('author-donations/:authorId')
    async getAuthorDonationStats(@Param('authorId') authorId: string) {
        return this.walletService.getAuthorDonationStats(authorId);
    }
}
