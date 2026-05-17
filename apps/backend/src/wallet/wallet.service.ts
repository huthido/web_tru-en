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
     * Smallest positive amount whose split still leaves the author > 0 coins,
     * given the fee %. Below this, ceil-rounded fee eats the whole amount.
     * Mirrors the inline guard in donateToAuthor so chapter pricing reuses it.
     */
    static minNetPrice(feePercent: number): number {
        const safePct = Math.max(0, Math.min(99, feePercent));
        return safePct > 0 ? Math.ceil(100 / (100 - safePct)) : 1;
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
            const minAmount = WalletService.minNetPrice(feePercent);
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
     * Buy a chapter (Transactional). Mirrors donateToAuthor: the buyer pays the
     * full `price`, the author is credited `net`, and the platform retains
     * `fee` (= donationPlatformFeePercent of price, rounded up — same setting as
     * donations). The ChapterPurchase record (with the fee/net breakdown) is
     * created inside the same transaction so there is no compensation problem.
     *
     * Idempotent: if the buyer already owns the chapter it returns without
     * charging again. The unique (userId, chapterId) constraint plus the
     * in-transaction check make concurrent double-buys safe.
     */
    async payForChapter(
        buyerId: string,
        authorId: string,
        chapter: { id: string; title: string; price: number },
    ) {
        if (!Number.isInteger(chapter.price) || chapter.price <= 0) {
            throw new BadRequestException('Chương này không bán bằng coin');
        }
        if (buyerId === authorId) {
            throw new BadRequestException('Bạn không thể mua chương của chính mình');
        }

        const feePercent = await this.getDonationFeePercent();
        const { fee, net } = WalletService.splitDonation(chapter.price, feePercent);
        if (net <= 0) {
            // Defense-in-depth: the author-facing price validator should have
            // rejected this already, but never let a purchase net the author 0.
            const minPrice = WalletService.minNetPrice(feePercent);
            throw new BadRequestException(
                `Giá chương quá thấp; tối thiểu phải là ${minPrice} coin`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Idempotency — bail out (no charge) if already purchased.
            const existing = await tx.chapterPurchase.findUnique({
                where: { userId_chapterId: { userId: buyerId, chapterId: chapter.id } },
            });
            if (existing) {
                const wallet = await tx.userWallet.findUnique({ where: { userId: buyerId } });
                return {
                    alreadyOwned: true,
                    newBalance: wallet?.balance ?? 0,
                    pricePaid: existing.pricePaid,
                };
            }

            // 2. Check buyer balance.
            const buyerWallet = await tx.userWallet.findUnique({ where: { userId: buyerId } });
            if (!buyerWallet || buyerWallet.balance < chapter.price) {
                throw new BadRequestException('Số dư không đủ để mua chương này');
            }

            // 3. Deduct the full price from the buyer.
            const updatedBuyerWallet = await tx.userWallet.update({
                where: { userId: buyerId },
                data: { balance: { decrement: chapter.price } },
            });

            // 4. Credit only `net` to the author; `fee` is retained by the
            //    platform (tracked on ChapterPurchase.platformFee — no platform
            //    wallet is credited, mirroring the donation behaviour).
            const authorWallet = await tx.userWallet.upsert({
                where: { userId: authorId },
                update: { balance: { increment: net } },
                create: { userId: authorId, balance: net },
            });

            // 5. Buyer transaction — fee is internal, buyer just "bought a chapter".
            await tx.coinTransaction.create({
                data: {
                    walletId: updatedBuyerWallet.id,
                    amount: -chapter.price,
                    type: TransactionType.PURCHASE_CHAPTER,
                    description: `Mua chương: ${chapter.title}`,
                    referenceId: chapter.id,
                },
            });

            // 6. Author transaction — surfaces the fee so the recipient sees the
            //    real number they received.
            const feeNote = fee > 0
                ? ` (đã trừ ${fee} coin phí nền tảng ${feePercent}%)`
                : '';
            await tx.coinTransaction.create({
                data: {
                    walletId: authorWallet.id,
                    amount: net,
                    type: TransactionType.PURCHASE_CHAPTER,
                    description: `Bán chương "${chapter.title}": +${net} coin${feeNote}`,
                    referenceId: buyerId,
                },
            });

            // 7. Purchase record with the full breakdown for revenue reporting.
            await tx.chapterPurchase.create({
                data: {
                    userId: buyerId,
                    chapterId: chapter.id,
                    pricePaid: chapter.price, // gross
                    platformFee: fee,
                    netAmount: net,
                },
            });

            return {
                alreadyOwned: false,
                newBalance: updatedBuyerWallet.balance,
                pricePaid: chapter.price,
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

    /**
     * Author-facing chapter-sales earnings. Same shape/semantics as
     * getMyDonationEarnings but sourced from ChapterPurchase. Filtered by the
     * author of the chapter's story (chapter → story → authorId).
     *   GET /api/wallet/chapter-sales/me
     */
    async getMyChapterSales(authorId: string) {
        const where = { chapter: { story: { authorId } } };

        const [aggregate, salesCount, recent, currentFeePercent] = await Promise.all([
            this.prisma.chapterPurchase.aggregate({
                where,
                _sum: { pricePaid: true, netAmount: true, platformFee: true },
            }),
            this.prisma.chapterPurchase.count({ where }),
            this.prisma.chapterPurchase.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    user: {
                        select: { id: true, username: true, displayName: true, avatar: true },
                    },
                    chapter: {
                        select: { id: true, title: true, slug: true },
                    },
                },
            }),
            this.getDonationFeePercent(),
        ]);

        return {
            totalGross: aggregate._sum.pricePaid || 0,
            totalNet: aggregate._sum.netAmount || 0,
            totalPlatformFee: aggregate._sum.platformFee || 0,
            platformFeePercent: currentFeePercent,
            salesCount,
            sales: recent.map(s => ({
                id: s.id,
                amount: s.pricePaid,       // gross — what the buyer paid
                netAmount: s.netAmount,    // what you actually received
                platformFee: s.platformFee,
                createdAt: s.createdAt,
                user: s.user,
                chapter: s.chapter,
            })),
        };
    }
}
