import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
    constructor(private prisma: PrismaService) { }

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

    // Donate coins to an author (Transactional)
    async donateToAuthor(userId: string, authorId: string, amount: number, storyId?: string, message?: string) {
        if (amount <= 0) throw new BadRequestException('Số coin phải lớn hơn 0');
        if (userId === authorId) throw new BadRequestException('Bạn không thể ủng hộ chính mình');

        // Verify author exists
        const author = await this.prisma.user.findUnique({ where: { id: authorId } });
        if (!author) throw new BadRequestException('Không tìm thấy tác giả');

        return this.prisma.$transaction(async (tx) => {
            // 1. Check sender balance
            const senderWallet = await tx.userWallet.findUnique({ where: { userId } });
            if (!senderWallet || senderWallet.balance < amount) {
                throw new BadRequestException('Số dư không đủ để ủng hộ');
            }

            // 2. Deduct from sender
            const updatedSenderWallet = await tx.userWallet.update({
                where: { userId },
                data: { balance: { decrement: amount } },
            });

            // 3. Deposit to author (upsert to create wallet if not exists)
            await tx.userWallet.upsert({
                where: { userId: authorId },
                update: { balance: { increment: amount } },
                create: { userId: authorId, balance: amount },
            });

            // 4. Create sender transaction record
            await tx.coinTransaction.create({
                data: {
                    walletId: updatedSenderWallet.id,
                    amount: -amount,
                    type: TransactionType.DONATE_AUTHOR,
                    description: `Ủng hộ tác giả ${author.displayName || author.username}`,
                    referenceId: authorId,
                },
            });

            // 5. Create author transaction record
            const authorWallet = await tx.userWallet.findUnique({ where: { userId: authorId } });
            if (authorWallet) {
                await tx.coinTransaction.create({
                    data: {
                        walletId: authorWallet.id,
                        amount: amount,
                        type: TransactionType.DONATE_AUTHOR,
                        description: `Nhận ủng hộ từ người dùng`,
                        referenceId: userId,
                    },
                });
            }

            // 6. Create donation record
            const donation = await tx.authorDonation.create({
                data: {
                    userId,
                    authorId,
                    storyId: storyId || null,
                    amount,
                    message: message || null,
                },
            });

            return {
                donation,
                newBalance: updatedSenderWallet.balance,
            };
        });
    }

    // Get author donation stats
    async getAuthorDonationStats(authorId: string) {
        const [totalDonations, donationCount, recentDonors] = await Promise.all([
            // Total coins received
            this.prisma.authorDonation.aggregate({
                where: { authorId },
                _sum: { amount: true },
            }),
            // Total number of donations
            this.prisma.authorDonation.count({
                where: { authorId },
            }),
            // Recent donors
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
            totalCoins: totalDonations._sum.amount || 0,
            donationCount,
            recentDonors: recentDonors.map(d => ({
                id: d.id,
                amount: d.amount,
                message: d.message,
                createdAt: d.createdAt,
                user: d.user,
            })),
        };
    }
}
