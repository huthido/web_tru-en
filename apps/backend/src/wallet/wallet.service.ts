import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransactionType, WithdrawalStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { MonetizationService } from '../monetization/monetization.service';

type WalletTx = Prisma.TransactionClient;

const REDIS_FEE_KEY_DONATION = 'wallet:fee:donation';
const REDIS_FEE_KEY_CHAPTER = 'wallet:fee:chapter';
const REDIS_FEE_INVALIDATE_CHANNEL = 'wallet:fee:invalidate';

const DEFAULT_MIN_WITHDRAWAL_COINS = 1000;

/**
 * Hard default if both Settings DB row and env var are missing.
 * 2 = platform keeps 2% of every donation, author receives 98%.
 */
export const DEFAULT_DONATION_PLATFORM_FEE_PERCENT = 2;

const FEE_CACHE_TTL_MS = 60_000; // 60s — admin's "update fee" UI feels instant in practice

@Injectable()
export class WalletService implements OnModuleInit {
    private readonly logger = new Logger(WalletService.name);
    // Local fee cache (instance-level). Hit first to avoid even Redis
    // round-trip on hot paths. TTL 60s. Cleared when this instance receives
    // a Redis pub/sub `invalidate` (admin updated Settings on a peer instance).
    private cachedFeePercent: number | null = null;
    private cachedFeeAt = 0;
    private cachedChapterFeePercent: number | null = null;
    private cachedChapterFeeAt = 0;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private notifications: NotificationsService,
        private redis: RedisService,
        private monetization: MonetizationService,
    ) { }

    async onModuleInit() {
        if (!this.redis.isEnabled()) return;
        // Subscribe so any admin-triggered invalidation on ANY instance
        // clears the local TTL on THIS instance too.
        await this.redis.subscribe(REDIS_FEE_INVALIDATE_CHANNEL, (msg) => {
            if (msg === 'donation' || msg === 'all') {
                this.cachedFeePercent = null;
                this.cachedFeeAt = 0;
            }
            if (msg === 'chapter' || msg === 'all') {
                this.cachedChapterFeePercent = null;
                this.cachedChapterFeeAt = 0;
            }
        });
    }

    // ─── Bucket helpers (Apple §3.1.1 / Google Play §4.3 compliance) ───────
    // Coins live in two buckets:
    //   purchasedBalance — bought via VNPay/Apple IAP/Google Play.
    //                      Spendable on content/transfer. NOT withdrawable.
    //   earnedBalance    — received from sales/donations/refunds.
    //                      Withdrawable as VND. NOT transferable.
    // The deprecated `balance` mirror = purchasedBalance + earnedBalance and is
    // kept in sync on every write so legacy read paths keep working until the
    // follow-up migration drops it.

    /** Credit the purchased bucket — DEPOSIT (VNPay/IAP/Play), TRANSFER recipient. */
    private async creditPurchased(tx: WalletTx, userId: string, amount: number) {
        return tx.userWallet.upsert({
            where: { userId },
            update: {
                purchasedBalance: { increment: amount },
                balance: { increment: amount },
            },
            create: {
                userId,
                purchasedBalance: amount,
                earnedBalance: 0,
                balance: amount,
            },
        });
    }

    /** Credit the earned bucket — sales/donation receipt, REFUND of rejected withdrawal. */
    private async creditEarned(tx: WalletTx, userId: string, amount: number) {
        return tx.userWallet.upsert({
            where: { userId },
            update: {
                earnedBalance: { increment: amount },
                balance: { increment: amount },
            },
            create: {
                userId,
                purchasedBalance: 0,
                earnedBalance: amount,
                balance: amount,
            },
        });
    }

    /**
     * Spend debit (SOFT) — chapter/story/donate.
     * Prefer purchasedBalance; fall back to earnedBalance only if purchased is
     * exhausted. Total = purchased + earned must cover the amount. Wallet lock
     * checked. Safe because spending earned coins on someone else's content
     * does not create a path to cash-out — recipient's earned coins are still
     * non-transferable.
     */
    private async debitForContent(tx: WalletTx, userId: string, amount: number) {
        const w = await tx.userWallet.findUnique({ where: { userId } });
        if (!w) throw new BadRequestException('Ví chưa được khởi tạo');
        if (w.isLocked) throw new ForbiddenException('Ví của bạn đang bị khóa');
        if (w.purchasedBalance + w.earnedBalance < amount) {
            throw new BadRequestException('Số dư không đủ');
        }
        const fromPurchased = Math.min(w.purchasedBalance, amount);
        const fromEarned = amount - fromPurchased;
        return tx.userWallet.update({
            where: { userId },
            data: {
                purchasedBalance: { decrement: fromPurchased },
                earnedBalance: { decrement: fromEarned },
                balance: { decrement: amount },
            },
        });
    }

    /**
     * Spend debit (STRICT) — TRANSFER sender only.
     * Purchased bucket only. Blocks the laundering path
     * (earned → friend → friend withdraws).
     */
    private async debitPurchasedStrict(tx: WalletTx, userId: string, amount: number) {
        const w = await tx.userWallet.findUnique({ where: { userId } });
        if (!w) throw new BadRequestException('Ví chưa được khởi tạo');
        if (w.isLocked) throw new ForbiddenException('Ví của bạn đang bị khóa');
        if (w.purchasedBalance < amount) {
            throw new BadRequestException(
                w.earnedBalance > 0
                    ? 'Chỉ xu đã nạp mới chuyển được. Xu doanh thu không thể chuyển cho người khác.'
                    : 'Số dư xu đã nạp không đủ',
            );
        }
        return tx.userWallet.update({
            where: { userId },
            data: {
                purchasedBalance: { decrement: amount },
                balance: { decrement: amount },
            },
        });
    }

    /** Withdrawal hold — earned bucket only. */
    private async debitForWithdrawal(tx: WalletTx, userId: string, amount: number) {
        const w = await tx.userWallet.findUnique({ where: { userId } });
        if (!w) throw new BadRequestException('Ví chưa được khởi tạo');
        if (w.isLocked) throw new ForbiddenException('Ví của bạn đang bị khóa');
        if (w.earnedBalance < amount) {
            throw new BadRequestException(
                w.purchasedBalance > 0
                    ? 'Số dư có thể rút không đủ. Chỉ xu từ doanh thu / donate mới rút được.'
                    : 'Số dư có thể rút không đủ',
            );
        }
        return tx.userWallet.update({
            where: { userId },
            data: {
                earnedBalance: { decrement: amount },
                balance: { decrement: amount },
            },
        });
    }

    /** External entrypoint for payment provider IPNs (VNPay / future Apple IAP / Google Play). */
    public async creditPurchasedExternal(tx: WalletTx, userId: string, amount: number) {
        return this.creditPurchased(tx, userId, amount);
    }

    /**
     * Fire-and-forget user notification; never breaks the caller.
     *
     * Tên giữ là `notifyAuthor` vì các call site cũ — thực tế nó dùng cho
     * MỌI user (donor, buyer, withdrawal requester...), không chỉ author.
     * `extras.type` mặc định `INFO`; truyền enum cụ thể (`DONATION_RECEIVED`
     * v.v.) để bell hiển thị đúng icon. `extras.actionUrl` cho deep-link
     * khi user click.
     */
    private notifyAuthor(
        authorId: string,
        title: string,
        content: string,
        extras?: { type?: NotificationType; actionUrl?: string },
    ) {
        this.notifications
            .notifyUser(authorId, {
                title,
                content,
                type: extras?.type,
                actionUrl: extras?.actionUrl,
            })
            .catch((e) => this.logger.warn(`notifyAuthor failed: ${e?.message}`));
    }

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
        // Tier 1: local in-process cache (no network).
        if (this.cachedFeePercent !== null && now - this.cachedFeeAt < FEE_CACHE_TTL_MS) {
            return this.cachedFeePercent;
        }
        // Tier 2: Redis (shared across instances, so admin-changed value is
        // visible to peers as soon as they next miss their local TTL).
        const fromRedis = await this.redis.get(REDIS_FEE_KEY_DONATION);
        if (fromRedis !== null) {
            const parsed = Number(fromRedis);
            if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 50) {
                this.cachedFeePercent = parsed;
                this.cachedFeeAt = now;
                return parsed;
            }
        }

        // Tier 3: DB / env / hard default. Repopulate both caches.
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
        await this.redis.set(REDIS_FEE_KEY_DONATION, String(percent), 60);
        return percent;
    }

    /**
     * Invalidate the donation-fee cache — called by SettingsService on admin
     * update. Clears local + Redis + broadcasts to peer instances so they
     * also clear their local TTL.
     */
    async invalidateFeeCache(): Promise<void> {
        this.cachedFeePercent = null;
        this.cachedFeeAt = 0;
        await this.redis.del(REDIS_FEE_KEY_DONATION);
        await this.redis.publish(REDIS_FEE_INVALIDATE_CHANNEL, 'donation');
    }

    /**
     * Resolve the current chapter/VIP-story sale fee %.
     * Same fallback chain as getDonationFeePercent (Settings → env → default)
     * but reads `chapterSaleFeePercent` so admin can tune sale vs donation
     * independently. Separate cache so each invalidates without coupling.
     */
    async getChapterSaleFeePercent(): Promise<number> {
        const now = Date.now();
        if (
            this.cachedChapterFeePercent !== null &&
            now - this.cachedChapterFeeAt < FEE_CACHE_TTL_MS
        ) {
            return this.cachedChapterFeePercent;
        }
        const fromRedis = await this.redis.get(REDIS_FEE_KEY_CHAPTER);
        if (fromRedis !== null) {
            const parsed = Number(fromRedis);
            if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 50) {
                this.cachedChapterFeePercent = parsed;
                this.cachedChapterFeeAt = now;
                return parsed;
            }
        }

        let percent = DEFAULT_DONATION_PLATFORM_FEE_PERCENT;
        try {
            const settings = await this.prisma.settings.findFirst({
                select: { chapterSaleFeePercent: true },
            });
            if (settings?.chapterSaleFeePercent != null) {
                percent = settings.chapterSaleFeePercent;
            } else {
                const envValue = Number(this.config.get<string>('CHAPTER_SALE_FEE_PERCENT'));
                if (Number.isInteger(envValue) && envValue >= 0 && envValue <= 50) {
                    percent = envValue;
                }
            }
        } catch (err: any) {
            this.logger.warn(`Failed to read chapter sale fee from Settings, using default ${percent}%: ${err.message}`);
        }

        this.cachedChapterFeePercent = percent;
        this.cachedChapterFeeAt = now;
        await this.redis.set(REDIS_FEE_KEY_CHAPTER, String(percent), 60);
        return percent;
    }

    /** Invalidate the chapter-sale fee cache. Same cross-instance protocol as donation. */
    async invalidateChapterFeeCache(): Promise<void> {
        this.cachedChapterFeePercent = null;
        this.cachedChapterFeeAt = 0;
        await this.redis.del(REDIS_FEE_KEY_CHAPTER);
        await this.redis.publish(REDIS_FEE_INVALIDATE_CHANNEL, 'chapter');
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

    // Get transaction history với pagination + filter type + date range.
    // Trả về { items, total, page, limit } để client dễ render pagination.
    async getTransactionHistory(
        userId: string,
        opts: {
            page?: number;
            limit?: number;
            types?: TransactionType[];
            startDate?: Date;
            endDate?: Date;
        } = {},
    ) {
        const wallet = await this.getBalance(userId);
        const page = Math.max(1, opts.page ?? 1);
        const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

        const where: any = { walletId: wallet.id };
        if (opts.types && opts.types.length > 0) {
            where.type = { in: opts.types };
        }
        if (opts.startDate || opts.endDate) {
            where.createdAt = {};
            if (opts.startDate) where.createdAt.gte = opts.startDate;
            if (opts.endDate) where.createdAt.lte = opts.endDate;
        }

        const [items, total] = await this.prisma.$transaction([
            this.prisma.coinTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.coinTransaction.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    // Deposit coins (Transactional)
    async deposit(userId: string, amount: number, description: string = 'Deposit') {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        const wallet = await this.prisma.$transaction(async (tx) => {
            // Deposit credits the purchased bucket — it represents real-money
            // top-up (VNPay/IAP/Play), which must not be withdrawable.
            const w = await this.creditPurchased(tx, userId, amount);

            await tx.coinTransaction.create({
                data: {
                    walletId: w.id,
                    amount,
                    type: TransactionType.DEPOSIT,
                    description,
                },
            });

            return w;
        });

        // Bell + push: user thấy ngay khi VNPay IPN / IAP redeem hoàn tất.
        this.notifyAuthor(
            userId,
            'Nạp xu thành công 💰',
            `Tài khoản của bạn vừa được cộng ${amount.toLocaleString('vi-VN')} xu.`,
            { type: NotificationType.COIN_DEPOSITED, actionUrl: '/wallet/history' },
        );

        return wallet;
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

        // Donate mở tự do cho mọi tác giả — eligibility chỉ gate "tạo paid
        // content" + ad revenue (xem MonetizationService docstring).

        const donationResult = await this.prisma.$transaction(async (tx) => {
            // 1. Debit donor (soft: purchased first, fall back to earned). Lock + funds checked.
            const updatedSenderWallet = await this.debitForContent(tx, userId, amount);

            // 2. Credit only `net` to the author's earned bucket. The `fee` is
            //    retained by the platform (tracked on AuthorDonation.platformFee
            //    — no platform wallet is credited so the fee effectively reduces
            //    the circulating coin supply).
            const authorWallet = await this.creditEarned(tx, authorId, net);

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

        this.notifyAuthor(
            authorId,
            'Bạn nhận được ủng hộ 🎉',
            `Có người vừa ủng hộ bạn ${amount} xu.`,
            { type: NotificationType.DONATION_RECEIVED, actionUrl: '/wallet/earnings' },
        );
        return donationResult;
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

        const feePercent = await this.getChapterSaleFeePercent();
        const { fee, net } = WalletService.splitDonation(chapter.price, feePercent);
        if (net <= 0) {
            // Defense-in-depth: the author-facing price validator should have
            // rejected this already, but never let a purchase net the author 0.
            const minPrice = WalletService.minNetPrice(feePercent);
            throw new BadRequestException(
                `Giá chương quá thấp; tối thiểu phải là ${minPrice} coin`,
            );
        }

        // Mua chương mở tự do — nếu tác giả đã tạo được chapter trả phí
        // thì có nghĩa đã có eligibility hoặc chapter được tạo trước khi
        // policy đổi; ở luồng mua không gate lại để khỏi block người mua.

        const chapterResult = await this.prisma.$transaction(async (tx) => {
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

            // 2. Debit buyer (soft: purchased first, fall back to earned). Lock + funds checked.
            const updatedBuyerWallet = await this.debitForContent(tx, buyerId, chapter.price);

            // 3. Credit only `net` to the author's earned bucket; `fee` is
            //    retained by the platform (tracked on ChapterPurchase.platformFee
            //    — no platform wallet is credited, mirroring the donation behaviour).
            const authorWallet = await this.creditEarned(tx, authorId, net);

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

        if (!chapterResult.alreadyOwned) {
            this.notifyAuthor(
                authorId,
                'Có người mua chương 📖',
                `Chương "${chapter.title}" vừa được mua (${chapter.price} xu).`,
                { type: NotificationType.CHAPTER_PURCHASED, actionUrl: '/wallet/earnings' },
            );
        }
        return chapterResult;
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

        const feePercent = await this.getChapterSaleFeePercent();
        const { fee, net } = WalletService.splitDonation(story.price, feePercent);
        if (net <= 0) {
            const minPrice = WalletService.minNetPrice(feePercent);
            throw new BadRequestException(
                `Giá truyện quá thấp; tối thiểu phải là ${minPrice} coin`,
            );
        }

        // Mua truyện VIP mở tự do — gate eligibility chỉ áp dụng khi tác giả
        // setup `accessType=VIP` ở stories.service.create/update.

        const storyResult = await this.prisma.$transaction(async (tx) => {
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

            const updatedBuyerWallet = await this.debitForContent(tx, buyerId, story.price);
            const authorWallet = await this.creditEarned(tx, authorId, net);

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

        if (!storyResult.alreadyOwned) {
            this.notifyAuthor(
                authorId,
                'Có người mua truyện VIP 👑',
                `Truyện "${story.title}" vừa được mua (${story.price} xu).`,
                { type: NotificationType.STORY_PURCHASED, actionUrl: '/wallet/earnings' },
            );
        }
        return storyResult;
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
            this.getChapterSaleFeePercent(),
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
            this.getChapterSaleFeePercent(),
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
            // Withdrawal hold — debits earnedBalance only. Locked wallets blocked inside helper.
            const updated = await this.debitForWithdrawal(tx, userId, amount);

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
        const processed = await this.prisma.$transaction(async (tx) => {
            const req = await tx.withdrawalRequest.findUnique({ where: { id: requestId } });
            if (!req) throw new NotFoundException('Không tìm thấy yêu cầu rút');
            if (req.status !== WithdrawalStatus.PENDING) {
                throw new BadRequestException('Yêu cầu này đã được xử lý');
            }

            if (action === 'REJECT') {
                // Refund the held coins back to the earned bucket (they came from
                // there — see requestWithdrawal). Restores withdrawability.
                const wallet = await this.creditEarned(tx, req.userId, req.amount);
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

        this.notifyAuthor(
            processed.userId,
            action === 'APPROVE' ? 'Yêu cầu rút đã được duyệt ✅' : 'Yêu cầu rút bị từ chối',
            action === 'APPROVE'
                ? `Yêu cầu rút ${processed.amount} xu của bạn đã được chuyển khoản.`
                : `Yêu cầu rút ${processed.amount} xu bị từ chối, xu đã được hoàn lại.${processed.note ? ` Lý do: ${processed.note}` : ''}`,
            { type: NotificationType.WITHDRAWAL_PROCESSED, actionUrl: '/wallet/withdrawals' },
        );
        return processed;
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

        const transferResult = await this.prisma.$transaction(async (tx) => {
            // STRICT: only purchased coins are transferable. Blocks the
            // earned→friend→friend-withdraws laundering path (Apple/Google
            // care because that turns IAP money into cash via a third party).
            const updatedSender = await this.debitPurchasedStrict(tx, senderId, amount);
            // Recipient gets purchased coins — they can spend but never withdraw,
            // preserving the invariant that earned coins are only ever the
            // platform's payout obligation.
            const recipientWallet = await this.creditPurchased(tx, recipient.id, amount);

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

        this.notifyAuthor(
            recipient.id,
            'Bạn nhận được xu 💰',
            `Bạn vừa nhận ${amount} xu từ chuyển khoản.`,
            { type: NotificationType.COIN_TRANSFER_RECEIVED, actionUrl: '/wallet/history' },
        );
        // Notify sender — đã tự confirm trên UI nhưng vẫn ghi lại bell để có
        // history tổng quát mọi sự kiện ví.
        this.notifyAuthor(
            senderId,
            'Chuyển xu thành công',
            `Bạn đã chuyển ${amount} xu cho ${recipient.displayName || recipient.username}.`,
            { type: NotificationType.INFO, actionUrl: '/wallet/history' },
        );
        return transferResult;
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
        return {
            user,
            isLocked: wallet.isLocked,
            purchasedBalance: wallet.purchasedBalance,
            earnedBalance: wallet.earnedBalance,
            balance: wallet.balance,
        };
    }

    async getWalletByUserId(identifier: string) {
        const user = await this.resolveUser(identifier);
        const wallet = await this.prisma.userWallet.findUnique({ where: { userId: user.id } });
        return {
            user,
            purchasedBalance: wallet?.purchasedBalance ?? 0,
            earnedBalance: wallet?.earnedBalance ?? 0,
            balance: wallet?.balance ?? 0,
            isLocked: wallet?.isLocked ?? false,
        };
    }

    /**
     * Admin-only debit of a single bucket. Bypasses isLocked (admin override
     * for fraud cleanup) but still refuses to push a bucket below zero.
     * Used by adminAdjustWallet for negative deltas.
     */
    private async adminDebitBucket(
        tx: WalletTx,
        userId: string,
        bucket: 'PURCHASED' | 'EARNED',
        amount: number,
    ) {
        const w = await tx.userWallet.findUnique({ where: { userId } });
        if (!w) throw new BadRequestException('Ví chưa được khởi tạo');
        const have = bucket === 'PURCHASED' ? w.purchasedBalance : w.earnedBalance;
        if (have < amount) {
            throw new BadRequestException(
                `${bucket === 'PURCHASED' ? 'Xu đã nạp' : 'Xu doanh thu'} không đủ để trừ (hiện có ${have})`,
            );
        }
        return tx.userWallet.update({
            where: { userId },
            data: bucket === 'PURCHASED'
                ? { purchasedBalance: { decrement: amount }, balance: { decrement: amount } }
                : { earnedBalance: { decrement: amount }, balance: { decrement: amount } },
        });
    }

    /**
     * Admin adjusts a user's wallet — credit or debit a specific bucket.
     * Use cases: fraud cleanup, support compensation, fixing backfill
     * casualties (authors who had earned coins migrated to purchasedBalance).
     * Audit-logged via CoinTransaction(type=ADMIN_ADJUST, referenceId=adminId).
     */
    async adminAdjustWallet(
        adminId: string,
        identifier: string,
        dto: { bucket: 'PURCHASED' | 'EARNED'; delta: number; note: string },
    ) {
        const { bucket, delta, note } = dto;
        if (bucket !== 'PURCHASED' && bucket !== 'EARNED') {
            throw new BadRequestException('Bucket không hợp lệ');
        }
        if (!Number.isInteger(delta) || delta === 0) {
            throw new BadRequestException('Delta phải là số nguyên khác 0');
        }
        const trimmed = note?.trim();
        if (!trimmed) {
            throw new BadRequestException('Vui lòng nhập ghi chú lý do điều chỉnh');
        }
        if (trimmed.length > 500) {
            throw new BadRequestException('Ghi chú tối đa 500 ký tự');
        }

        const user = await this.resolveUser(identifier);
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { username: true, displayName: true },
        });
        const adminLabel = admin?.displayName || admin?.username || 'admin';
        const bucketLabel = bucket === 'PURCHASED' ? 'xu nạp' : 'xu doanh thu';

        const updated = await this.prisma.$transaction(async (tx) => {
            let wallet;
            if (delta > 0) {
                wallet = bucket === 'PURCHASED'
                    ? await this.creditPurchased(tx, user.id, delta)
                    : await this.creditEarned(tx, user.id, delta);
            } else {
                wallet = await this.adminDebitBucket(tx, user.id, bucket, -delta);
            }

            const sign = delta > 0 ? '+' : '';
            await tx.coinTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: delta,
                    type: TransactionType.ADMIN_ADJUST,
                    description: `Admin ${adminLabel} điều chỉnh ${sign}${delta} ${bucketLabel} — ${trimmed}`,
                    referenceId: adminId,
                },
            });

            return wallet;
        });

        // Notify the affected user so they have a record outside the audit trail.
        this.notifyAuthor(
            user.id,
            'Ví của bạn vừa được điều chỉnh bởi admin',
            `Admin ${adminLabel} đã ${delta > 0 ? 'cộng' : 'trừ'} ${Math.abs(delta).toLocaleString('vi-VN')} ${bucketLabel}. Lý do: ${trimmed}`,
            { type: NotificationType.INFO, actionUrl: '/wallet/history' },
        );

        return {
            user,
            purchasedBalance: updated.purchasedBalance,
            earnedBalance: updated.earnedBalance,
            balance: updated.balance,
            isLocked: updated.isLocked,
        };
    }
}
