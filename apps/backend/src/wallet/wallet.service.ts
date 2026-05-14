import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

/**
 * Hard default if both Settings DB row and env var are missing.
 * 2 = platform keeps 2% of every donation, author receives 98%.
 */
export const DEFAULT_DONATION_PLATFORM_FEE_PERCENT = 2;

const FEE_CACHE_TTL_MS = 60_000; // 60s — admin's "update fee" UI feels instant in practice

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);
    private cachedFeePercent: number | null = null;
    private cachedFeeAt = 0;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) { }

    /**
     * Pure helper — split a donation given a percent. Fee is rounded UP so the
     * platform isn't short-changed by rounding (author gets at most amount-1
     * coins for very small donations).
     */
    static splitDonation(amount: number, feePercent: number): { fee: number; net: number } {
        const safePct = Math.max(0, Math.min(100, feePercent));
        const fee = Math.ceil((amount * safePct) / 100);
        const net = amount - fee;
        return { fee, net };
    }

    /**
     * Resolve the current donation fee %.
     * Priority: Settings DB row → DONATION_PLATFORM_FEE_PERCENT env → hard default.
     * Cached for 60s to avoid hitting the DB on every donation; admin's UI
     * update takes effect on the next minute at worst.
     */
    async getDonationFeePercent(): Promise<number> {
        const now = Date.now();
        if (this.cachedFeePercent !== null && now - this.cachedFeeAt < FEE_CACHE_TTL_MS) {
            return this.cachedFeePercent;
        }

        let percent = DEFAULT_DONATION_PLATFORM_FEE_PERCENT;
        try {
            const settings = await this.prisma.settings.findFirst({
                select: { donationPlatformFeePercent: true },
            });
            if (settings?.donationPlatformFeePercent != null) {
                percent = settings.donationPlatformFeePercent;
            } else {
                const envValue = Number(this.config.get<string>('DONATION_PLATFORM_FEE_PERCENT'));
                if (Number.isInteger(envValue) && envValue >= 0 && envValue <= 50) {
                    percent = envValue;
                }
            }
        } catch (err: any) {
            this.logger.warn(`Failed to read donation fee from Settings, using default ${percent}%: ${err.message}`);
        }

        this.cachedFeePercent = percent;
        this.cachedFeeAt = now;
        return percent;
    }

    /** Invalidate the cache — called by SettingsService when admin updates the fee. */
    invalidateFeeCache(): void {
        this.cachedFeePercent = null;
        this.cachedFeeAt = 0;
    }

    // Get wallet balance, create if not exists
    async getBalance(userId: string) {
        let wallet = await this.prisma.userWallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            wallet = await this.prisma.userWallet.create({
                data: { userId },
            });
        }

        return wallet;
    }

    // Get transaction history
    async getTransactionHistory(userId: string, limit = 20) {
        const wallet = await this.getBalance(userId);
        return this.prisma.coinTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // Deposit coins (Transactional)
    async deposit(userId: string, amount: number, description: string = 'Deposit') {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        return this.prisma.$transaction(async (tx) => {
            // 1. Get or create wallet and increment balance
            const wallet = await tx.userWallet.upsert({
                where: { userId },
                update: { balance: { increment: amount } },
                create: { userId, balance: amount },
            });

            // 2. Create transaction record
            await tx.coinTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount,
                    type: TransactionType.DEPOSIT,
                    description,
                },
            });

            return wallet;
        });
    }

    // Pay for an item (Transactional)
    async pay(userId: string, amount: number, description: string, referenceId?: string) {
        if (amount < 0) throw new BadRequestException('Amount cannot be negative');

        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.userWallet.findUnique({ where: { userId } });

            if (!wallet || wallet.balance < amount) {
                throw new BadRequestException('Insufficient balance');
            }

            // 1. Deduct balance
            const updatedWallet = await tx.userWallet.update({
                where: { userId },
                data: { balance: { decrement: amount } },
            });

            // 2. Create transaction record
            await tx.coinTransaction.create({
                data: {
                    walletId: updatedWallet.id,
                    amount: -amount, // Negative for spending
                    type: TransactionType.PURCHASE_CHAPTER,
                    description,
                    referenceId,
                },
            });

            return updatedWallet;
        });
    }

    // Donate coins to an author (Transactional).
    // The platform keeps Settings.donationPlatformFeePercent (default 2%), the rest
    // goes to the author. Both the gross `amount` and the breakdown are persisted
    // on AuthorDonation for accurate revenue reporting.
    async donateToAuthor(userId: string, authorId: string, amount: number, storyId?: string, message?: string) {
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new BadRequestException('Số coin phải là số nguyên dương');
        }
        if (userId === authorId) throw new BadRequestException('Bạn không thể ủng hộ chính mình');

        const feePercent = await this.getDonationFeePercent();
        const { fee, net } = WalletService.splitDonation(amount, feePercent);
        if (net <= 0) {
            // For non-zero fee, the minimum donation is the smallest amount where
            // ceil(amount * feePercent / 100) < amount. Generic so it stays correct
            // as the fee % is tuned.
            const minAmount = feePercent > 0 ? Math.ceil(100 / (100 - feePercent)) : 1;
            throw new BadRequestException(
                `Số coin tối thiểu để ủng hộ là ${minAmount}`,
            );
        }

        // Verify author exists
        const author = await this.prisma.user.findUnique({ where: { id: authorId } });
        if (!author) throw new BadRequestException('Không tìm thấy tác giả');

        return this.prisma.$transaction(async (tx) => {
            // 1. Check sender balance
            const senderWallet = await tx.userWallet.findUnique({ where: { userId } });
            if (!senderWallet || senderWallet.balance < amount) {
                throw new BadRequestException('Số dư không đủ để ủng hộ');
            }

            // 2. Deduct full amount from sender (they pay the gross — fee is invisible to them)
            const updatedSenderWallet = await tx.userWallet.update({
                where: { userId },
                data: { balance: { decrement: amount } },
            });

            // 3. Credit only `net` to the author. The `fee` is retained by the platform
            //    (tracked on AuthorDonation.platformFee — no platform wallet is credited
            //    so the fee effectively reduces the circulating coin supply).
            const authorWallet = await tx.userWallet.upsert({
                where: { userId: authorId },
                update: { balance: { increment: net } },
                create: { userId: authorId, balance: net },
            });

            // 4. Sender transaction: NO mention of the platform fee — from the donor's
            //    perspective they donated `amount` coins to the author. Fee is internal.
            await tx.coinTransaction.create({
                data: {
                    walletId: updatedSenderWallet.id,
                    amount: -amount,
                    type: TransactionType.DONATE_AUTHOR,
                    description: `Ủng hộ tác giả ${author.displayName || author.username}`,
                    referenceId: authorId,
                },
            });

            // 5. Author transaction: surfaces the fee so the recipient sees the real number.
            const feeNote = fee > 0
                ? ` (đã trừ ${fee} coin phí nền tảng ${feePercent}%)`
                : '';
            await tx.coinTransaction.create({
                data: {
                    walletId: authorWallet.id,
                    amount: net,
                    type: TransactionType.DONATE_AUTHOR,
                    description: `Nhận ủng hộ ${amount} coin${feeNote}`,
                    referenceId: userId,
                },
            });

            // 6. Donation record — store gross + fee + net for accurate reporting on the
            //    author dashboard. The public stats endpoint hides fee/net from outsiders.
            const donation = await tx.authorDonation.create({
                data: {
                    userId,
                    authorId,
                    storyId: storyId || null,
                    amount, // gross
                    platformFee: fee,
                    netAmount: net,
                    message: message || null,
                },
            });

            // Public-facing response: only echo back what the donor sees (full amount + balance).
            return {
                donationId: donation.id,
                amount,
                newBalance: updatedSenderWallet.balance,
            };
        });
    }

    /**
     * Donor-facing stats for an author profile page.
     * PUBLIC — does NOT expose the platform fee. From the public's perspective
     * every coin donated went to the author (which is true from the donor side
     * since they paid the gross amount).
     */
    async getAuthorDonationStats(authorId: string) {
        const [aggregate, donationCount, recentDonors] = await Promise.all([
            this.prisma.authorDonation.aggregate({
                where: { authorId },
                _sum: { amount: true }, // gross only
            }),
            this.prisma.authorDonation.count({
                where: { authorId },
            }),
            this.prisma.authorDonation.findMany({
                where: { authorId },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    user: {
                        select: { id: true, username: true, displayName: true, avatar: true },
                    },
                },
            }),
        ]);

        return {
            totalCoins: aggregate._sum.amount || 0, // gross — donor view
            donationCount,
            recentDonors: recentDonors.map(d => ({
                id: d.id,
                amount: d.amount, // gross — what the donor paid
                message: d.message,
                createdAt: d.createdAt,
                user: d.user,
            })),
        };
    }

    /**
     * Author-facing stats — only the author themselves should hit this. Returns
     * the actual revenue split so the author knows what they really received.
     * Controller enforces ownership.
     */
    async getMyDonationEarnings(authorId: string) {
        const [aggregate, donationCount, recent, currentFeePercent] = await Promise.all([
            this.prisma.authorDonation.aggregate({
                where: { authorId },
                _sum: { amount: true, netAmount: true, platformFee: true },
            }),
            this.prisma.authorDonation.count({
                where: { authorId },
            }),
            this.prisma.authorDonation.findMany({
                where: { authorId },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    user: {
                        select: { id: true, username: true, displayName: true, avatar: true },
                    },
                },
            }),
            this.getDonationFeePercent(),
        ]);

        return {
            totalGross: aggregate._sum.amount || 0,
            totalNet: aggregate._sum.netAmount || 0,
            totalPlatformFee: aggregate._sum.platformFee || 0,
            // Current fee % (for the UI "we keep X% per donation" hint). Historical
            // donations in `donations[]` still carry their original fee from the
            // moment the donation was made (platformFee field).
            platformFeePercent: currentFeePercent,
            donationCount,
            donations: recent.map(d => ({
                id: d.id,
                amount: d.amount,          // gross — what the donor paid
                netAmount: d.netAmount,    // what you actually received
                platformFee: d.platformFee,
                message: d.message,
                createdAt: d.createdAt,
                user: d.user,
            })),
        };
    }
}
