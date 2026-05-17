import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
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

    // Public donor-facing stats. Does NOT expose the 2% platform fee — from the
    // donor's perspective the full amount went to the author.
    @Public()
    @Get('author-donations/:authorId')
    async getAuthorDonationStats(@Param('authorId') authorId: string) {
        return this.walletService.getAuthorDonationStats(authorId);
    }

    /**
     * Author-facing donation earnings — shows the real revenue split (gross/net/fee).
     * Auth required: only the logged-in user sees THEIR OWN earnings.
     *   GET /api/wallet/donations/me
     */
    @Get('donations/me')
    @UseGuards(JwtAuthGuard)
    async getMyDonationEarnings(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getMyDonationEarnings(user.id);
    }

    /**
     * Author-facing chapter-sales earnings (gross/net/fee).
     * Auth required: only the logged-in user sees THEIR OWN sales.
     *   GET /api/wallet/chapter-sales/me
     */
    @Get('chapter-sales/me')
    @UseGuards(JwtAuthGuard)
    async getMyChapterSales(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getMyChapterSales(user.id);
    }

    /**
     * Author-facing VIP story-sales earnings (gross/net/fee).
     *   GET /api/wallet/story-sales/me
     */
    @Get('story-sales/me')
    @UseGuards(JwtAuthGuard)
    async getMyStorySales(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getMyStorySales(user.id);
    }

    /**
     * Author-facing today's net revenue across all sources.
     *   GET /api/wallet/today-earnings/me
     */
    @Get('today-earnings/me')
    @UseGuards(JwtAuthGuard)
    async getMyTodayEarnings(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getMyTodayEarnings(user.id);
    }

    // --- Withdrawals (spec mục 17) ---

    @Post('withdrawals')
    @UseGuards(JwtAuthGuard)
    async requestWithdrawal(
        @Request() req: any,
        @Body() body: { amount: number; bankName: string; bankAccountNumber: string; bankAccountName: string },
    ) {
        const user = req.user as User;
        return this.walletService.requestWithdrawal(user.id, body.amount, {
            bankName: body.bankName,
            bankAccountNumber: body.bankAccountNumber,
            bankAccountName: body.bankAccountName,
        });
    }

    @Get('withdrawals/me')
    @UseGuards(JwtAuthGuard)
    async listMyWithdrawals(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.listMyWithdrawals(user.id);
    }
}
