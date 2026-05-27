import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { TransactionType, User } from '@prisma/client';

const ALL_TRANSACTION_TYPES = new Set<TransactionType>(Object.values(TransactionType));

@Controller('wallet')
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get('balance')
    @UseGuards(JwtAuthGuard)
    async getBalance(@Request() req: any) {
        const user = req.user as User;
        return this.walletService.getBalance(user.id);
    }

    /**
     * Lịch sử giao dịch của user đang đăng nhập, với pagination + filter.
     *   GET /api/wallet/history?page=1&limit=20&type=DEPOSIT,WITHDRAWAL&startDate=...&endDate=...
     * - `type`: CSV TransactionType, vd `DEPOSIT,PURCHASE_CHAPTER`.
     * - `startDate`/`endDate`: ISO 8601 (vd `2026-01-01T00:00:00Z`).
     */
    @Get('history')
    @UseGuards(JwtAuthGuard)
    async getHistory(
        @Request() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('type') type?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const user = req.user as User;

        let types: TransactionType[] | undefined;
        if (type) {
            const parsed = type
                .split(',')
                .map((t) => t.trim().toUpperCase())
                .filter(Boolean) as TransactionType[];
            const invalid = parsed.filter((t) => !ALL_TRANSACTION_TYPES.has(t));
            if (invalid.length > 0) {
                throw new BadRequestException(`Loại giao dịch không hợp lệ: ${invalid.join(', ')}`);
            }
            types = parsed;
        }

        const parseDate = (s: string | undefined, name: string) => {
            if (!s) return undefined;
            const d = new Date(s);
            if (Number.isNaN(d.getTime())) {
                throw new BadRequestException(`${name} không phải ngày hợp lệ (ISO 8601).`);
            }
            return d;
        };

        return this.walletService.getTransactionHistory(user.id, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            types,
            startDate: parseDate(startDate, 'startDate'),
            endDate: parseDate(endDate, 'endDate'),
        });
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

    // --- Coin transfer (spec mục 2) ---

    @Post('transfer')
    @UseGuards(JwtAuthGuard)
    async transferCoins(
        @Request() req: any,
        @Body() body: { recipient: string; amount: number; message?: string },
    ) {
        const user = req.user as User;
        return this.walletService.transferCoins(user.id, body.recipient, body.amount, body.message);
    }
}
