import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, WithdrawalStatus } from '@prisma/client';

const DEFAULT_MIN_WITHDRAWAL_COINS = 1000;

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
            if (senderWallet?.isLocked) {
                throw new ForbiddenException('Ví của bạn đang bị khóa');
            }
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
            if (buyerWallet?.isLocked) {
                throw new ForbiddenException('Ví của bạn đang bị khóa');
            }
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
     * Buy a whole VIP story (Transactional). Same economics as payForChapter
     * (buyer pays gross, author gets net, platform keeps fee) but a single
     * StoryPurchase row unlocks every chapter of the story. Idempotent.
     */
    async payForStory(
        buyerId: string,
        authorId: string,
        story: { id: string; title: string; price: number },
    ) {
        if (!Number.isInteger(story.price) || story.price <= 0) {
            throw new BadRequestException('Truyện này không bán bằng coin');
        }
        if (buyerId === authorId) {
            throw new BadRequestException('Bạn không thể mua truyện của chính mình');
        }

        const feePercent = await this.getDonationFeePercent();
        const { fee, net } = WalletService.splitDonation(story.price, feePercent);
        if (net <= 0) {
            const minPrice = WalletService.minNetPrice(feePercent);
            throw new BadRequestException(
                `Giá truyện quá thấp; tối thiểu phải là ${minPrice} coin`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.storyPurchase.findUnique({
                where: { userId_storyId: { userId: buyerId, storyId: story.id } },
            });
            if (existing) {
                const wallet = await tx.userWallet.findUnique({ where: { userId: buyerId } });
                return {
                    alreadyOwned: true,
                    newBalance: wallet?.balance ?? 0,
                    pricePaid: existing.pricePaid,
                };
            }

            const buyerWallet = await tx.userWallet.findUnique({ where: { userId: buyerId } });
            if (buyerWallet?.isLocked) {
                throw new ForbiddenException('Ví của bạn đang bị khóa');
            }
            if (!buyerWallet || buyerWallet.balance < story.price) {
                throw new BadRequestException('Số dư không đủ để mua truyện này');
            }

            const updatedBuyerWallet = await tx.userWallet.update({
                where: { userId: buyerId },
                data: { balance: { decrement: story.price } },
            });

            const authorWallet = await tx.userWallet.upsert({
                where: { userId: authorId },
                update: { balance: { increment: net } },
                create: { userId: authorId, balance: net },
            });

            await tx.coinTransaction.create({
                data: {
                    walletId: updatedBuyerWallet.id,
                    amount: -story.price,
                    type: TransactionType.PURCHASE_STORY,
                    description: `Mua truyện VIP: ${story.title}`,
                    referenceId: story.id,
                },
            });

            const feeNote = fee > 0
                ? ` (đã trừ ${fee} coin phí nền tảng ${feePercent}%)`
                : '';
            await tx.coinTransaction.create({
                data: {
                    walletId: authorWallet.id,
                    amount: net,
                    type: TransactionType.PURCHASE_STORY,
                    description: `Bán truyện "${story.title}": +${net} coin${feeNote}`,
                    referenceId: buyerId,
                },
            });

            await tx.storyPurchase.create({
                data: {
                    userId: buyerId,
                    storyId: story.id,
                    pricePaid: story.price,
                    platformFee: fee,
                    netAmount: net,
                },
            });

            return {
                alreadyOwned: false,
                newBalance: updatedBuyerWallet.balance,
                pricePaid: story.price,
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
        // Start of the current ISO-ish week (Monday 00:00 local).
        const weekStart = new Date();
        const day = (weekStart.getDay() + 6) % 7; // Mon=0 … Sun=6
        weekStart.setDate(weekStart.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);

        const [aggregate, donationCount, recentDonors, weekGrouped] = await Promise.all([
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
            this.prisma.authorDonation.groupBy({
                by: ['userId'],
                where: { authorId, createdAt: { gte: weekStart } },
                _sum: { amount: true },
                orderBy: { _sum: { amount: 'desc' } },
                take: 5,
            }),
        ]);

        // Resolve user info for the weekly top donors.
        const topUsers = weekGrouped.length
            ? await this.prisma.user.findMany({
                where: { id: { in: weekGrouped.map(g => g.userId) } },
                select: { id: true, username: true, displayName: true, avatar: true },
            })
            : [];
        const userMap = new Map(topUsers.map(u => [u.id, u]));
        const topDonorsWeek = weekGrouped.map(g => ({
            amount: g._sum.amount || 0, // gross total this week
            user: userMap.get(g.userId) || null,
        }));

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
            topDonorsWeek,
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

    /**
     * Author-facing VIP story-sales earnings. Same shape as getMyChapterSales
     * but sourced from StoryPurchase (filtered by the story's author).
     *   GET /api/wallet/story-sales/me
     */
    async getMyStorySales(authorId: string) {
        const where = { story: { authorId } };

        const [aggregate, salesCount, recent, currentFeePercent] = await Promise.all([
            this.prisma.storyPurchase.aggregate({
                where,
                _sum: { pricePaid: true, netAmount: true, platformFee: true },
            }),
            this.prisma.storyPurchase.count({ where }),
            this.prisma.storyPurchase.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    user: {
                        select: { id: true, username: true, displayName: true, avatar: true },
                    },
                    story: {
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
                amount: s.pricePaid,
                netAmount: s.netAmount,
                platformFee: s.platformFee,
                createdAt: s.createdAt,
                user: s.user,
                story: s.story,
            })),
        };
    }

    /**
     * Author-facing "doanh thu hôm nay" (spec mục 17 dashboard). Sums the NET
     * coins the author earned since local midnight across all revenue sources:
     * donations + chapter sales + VIP story sales.
     *   GET /api/wallet/today-earnings/me
     */
    async getMyTodayEarnings(authorId: string) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const createdAt = { gte: start };

        const [donations, chapterSales, storySales] = await Promise.all([
            this.prisma.authorDonation.aggregate({
                where: { authorId, createdAt },
                _sum: { netAmount: true },
                _count: true,
            }),
            this.prisma.chapterPurchase.aggregate({
                where: { chapter: { story: { authorId } }, createdAt },
                _sum: { netAmount: true },
                _count: true,
            }),
            this.prisma.storyPurchase.aggregate({
                where: { story: { authorId }, createdAt },
                _sum: { netAmount: true },
                _count: true,
            }),
        ]);

        const donationNet = donations._sum.netAmount || 0;
        const chapterNet = chapterSales._sum.netAmount || 0;
        const storyNet = storySales._sum.netAmount || 0;

        return {
            date: start.toISOString(),
            donationNet,
            chapterNet,
            storyNet,
            total: donationNet + chapterNet + storyNet,
            counts: {
                donations: donations._count,
                chapterSales: chapterSales._count,
                storySales: storySales._count,
            },
        };
    }

    /** Min coins an author may withdraw (Settings, fallback constant). */
    private async getMinWithdrawalCoins(): Promise<number> {
        try {
            const s = await this.prisma.settings.findFirst({
                select: { minWithdrawalCoins: true },
            });
            if (s?.minWithdrawalCoins != null) return s.minWithdrawalCoins;
        } catch (err: any) {
            this.logger.warn(`minWithdrawalCoins read failed: ${err.message}`);
        }
        return DEFAULT_MIN_WITHDRAWAL_COINS;
    }

    /**
     * Create a withdrawal request (spec mục 17). Coins are HELD immediately:
     * the wallet is debited and a WITHDRAWAL transaction recorded inside one
     * transaction. Rejection later refunds. This prevents the author from
     * spending coins that are pending payout.
     */
    async requestWithdrawal(
        userId: string,
        amount: number,
        bank: { bankName: string; bankAccountNumber: string; bankAccountName: string },
    ) {
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new BadRequestException('Số xu rút phải là số nguyên dương');
        }
        const min = await this.getMinWithdrawalCoins();
        if (amount < min) {
            throw new BadRequestException(`Số xu rút tối thiểu là ${min}`);
        }
        const bankName = bank.bankName?.trim();
        const bankAccountNumber = bank.bankAccountNumber?.trim();
        const bankAccountName = bank.bankAccountName?.trim();
        if (!bankName || !bankAccountNumber || !bankAccountName) {
            throw new BadRequestException('Vui lòng nhập đầy đủ thông tin ngân hàng');
        }

        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.userWallet.findUnique({ where: { userId } });
            if (wallet?.isLocked) {
                throw new ForbiddenException('Ví của bạn đang bị khóa');
            }
            if (!wallet || wallet.balance < amount) {
                throw new BadRequestException('Số dư không đủ để rút');
            }

            const updated = await tx.userWallet.update({
                where: { userId },
                data: { balance: { decrement: amount } },
            });

            await tx.coinTransaction.create({
                data: {
                    walletId: updated.id,
                    amount: -amount,
                    type: TransactionType.WITHDRAWAL,
                    description: `Yêu cầu rút ${amount} xu (đang chờ duyệt)`,
                },
            });

            const request = await tx.withdrawalRequest.create({
                data: {
                    userId,
                    amount,
                    bankName,
                    bankAccountNumber,
                    bankAccountName,
                },
            });

            return { request, newBalance: updated.balance };
        });
    }

    /** Author's own withdrawal history. */
    async listMyWithdrawals(userId: string) {
        return this.prisma.withdrawalRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    /** Admin: list withdrawal requests, optionally filtered by status. */
    async listWithdrawals(status?: WithdrawalStatus) {
        return this.prisma.withdrawalRequest.findMany({
            where: status ? { status } : undefined,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 200,
            include: {
                user: { select: { id: true, username: true, displayName: true, email: true } },
            },
        });
    }

    /**
     * Admin processes a request. APPROVE = payout done (coins already held, no
     * further wallet change). REJECT = refund the held coins back to the wallet.
     * Idempotent on already-processed requests.
     */
    async processWithdrawal(
        adminId: string,
        requestId: string,
        action: 'APPROVE' | 'REJECT',
        note?: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const req = await tx.withdrawalRequest.findUnique({ where: { id: requestId } });
            if (!req) throw new NotFoundException('Không tìm thấy yêu cầu rút');
            if (req.status !== WithdrawalStatus.PENDING) {
                throw new BadRequestException('Yêu cầu này đã được xử lý');
            }

            if (action === 'REJECT') {
                // Refund the held coins.
                const wallet = await tx.userWallet.upsert({
                    where: { userId: req.userId },
                    update: { balance: { increment: req.amount } },
                    create: { userId: req.userId, balance: req.amount },
                });
                await tx.coinTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: req.amount,
                        type: TransactionType.REFUND,
                        description: `Hoàn ${req.amount} xu — yêu cầu rút bị từ chối`,
                        referenceId: req.id,
                    },
                });
            }

            return tx.withdrawalRequest.update({
                where: { id: req.id },
                data: {
                    status: action === 'APPROVE' ? WithdrawalStatus.APPROVED : WithdrawalStatus.REJECTED,
                    note: note?.trim() || null,
                    processedById: adminId,
                    processedAt: new Date(),
                },
            });
        });
    }

    // --- Coin transfer (spec mục 2) ---

    /** Whether user-to-user transfer is enabled (Settings, default off). */
    private async isTransferEnabled(): Promise<boolean> {
        try {
            const s = await this.prisma.settings.findFirst({
                select: { allowCoinTransfer: true },
            });
            return !!s?.allowCoinTransfer;
        } catch {
            return false;
        }
    }

    /**
     * Transfer coins user → user. No platform fee (spec mục 17 fee table does
     * not include transfers). Gated by Settings.allowCoinTransfer. Recipient
     * resolved by username or email. Atomic; sender wallet must not be locked.
     */
    async transferCoins(
        senderId: string,
        recipientIdentifier: string,
        amount: number,
        message?: string,
    ) {
        if (!(await this.isTransferEnabled())) {
            throw new ForbiddenException('Tính năng chuyển xu hiện đang tắt');
        }
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new BadRequestException('Số xu chuyển phải là số nguyên dương');
        }
        const ident = recipientIdentifier?.trim();
        if (!ident) throw new BadRequestException('Vui lòng nhập người nhận');

        const recipient = await this.prisma.user.findFirst({
            where: { OR: [{ username: ident }, { email: ident.toLowerCase() }] },
            select: { id: true, username: true, displayName: true },
        });
        if (!recipient) throw new NotFoundException('Không tìm thấy người nhận');
        if (recipient.id === senderId) {
            throw new BadRequestException('Không thể chuyển xu cho chính mình');
        }

        return this.prisma.$transaction(async (tx) => {
            const senderWallet = await tx.userWallet.findUnique({ where: { userId: senderId } });
            if (senderWallet?.isLocked) {
                throw new ForbiddenException('Ví của bạn đang bị khóa');
            }
            if (!senderWallet || senderWallet.balance < amount) {
                throw new BadRequestException('Số dư không đủ để chuyển');
            }

            const updatedSender = await tx.userWallet.update({
                where: { userId: senderId },
                data: { balance: { decrement: amount } },
            });

            const recipientWallet = await tx.userWallet.upsert({
                where: { userId: recipient.id },
                update: { balance: { increment: amount } },
                create: { userId: recipient.id, balance: amount },
            });

            const note = message?.trim() ? ` — "${message.trim()}"` : '';
            await tx.coinTransaction.create({
                data: {
                    walletId: updatedSender.id,
                    amount: -amount,
                    type: TransactionType.TRANSFER,
                    description: `Chuyển ${amount} xu cho ${recipient.displayName || recipient.username}${note}`,
                    referenceId: recipient.id,
                },
            });
            await tx.coinTransaction.create({
                data: {
                    walletId: recipientWallet.id,
                    amount,
                    type: TransactionType.TRANSFER,
                    description: `Nhận ${amount} xu từ chuyển khoản${note}`,
                    referenceId: senderId,
                },
            });

            return {
                success: true,
                newBalance: updatedSender.balance,
                recipient: { id: recipient.id, username: recipient.username, displayName: recipient.displayName },
            };
        });
    }

    // --- Admin wallet lock (spec mục 2 — chống gian lận) ---

    /** Resolve a user by id, username or email (admin convenience). */
    private async resolveUser(identifier: string) {
        const ident = identifier?.trim();
        if (!ident) throw new BadRequestException('Thiếu định danh người dùng');
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ id: ident }, { username: ident }, { email: ident.toLowerCase() }] },
            select: { id: true, username: true, displayName: true, email: true },
        });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');
        return user;
    }

    async setWalletLock(identifier: string, locked: boolean) {
        const user = await this.resolveUser(identifier);
        const wallet = await this.prisma.userWallet.upsert({
            where: { userId: user.id },
            update: { isLocked: locked },
            create: { userId: user.id, isLocked: locked },
        });
        return { user, isLocked: wallet.isLocked, balance: wallet.balance };
    }

    async getWalletByUserId(identifier: string) {
        const user = await this.resolveUser(identifier);
        const wallet = await this.prisma.userWallet.findUnique({ where: { userId: user.id } });
        return {
            user,
            balance: wallet?.balance ?? 0,
            isLocked: wallet?.isLocked ?? false,
        };
    }
}
