/**
 * Unit tests for the bucket logic introduced in commit e9d8ba1
 * (UserWallet.purchasedBalance + earnedBalance for Apple §3.1.1 compliance).
 *
 * Strategy: spin up a real WalletService with mocked PrismaService /
 * ConfigService / NotificationsService. The mocked Prisma "transaction
 * client" operates on an in-memory wallet record so the bucket allocation
 * logic is exercised end-to-end without touching a DB.
 *
 * We test the 4 private helpers directly through type-casts because they
 * are the regression-prone code path; the public methods compose them
 * with notification / transaction-record side effects that aren't
 * relevant to the bucket invariants.
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WalletService } from './wallet.service';

type MockWallet = {
    id: string;
    userId: string;
    purchasedBalance: number;
    earnedBalance: number;
    balance: number;
    isLocked: boolean;
};

function makeWallet(userId: string, init: Partial<MockWallet> = {}): MockWallet {
    return {
        id: `w-${userId}`,
        userId,
        purchasedBalance: init.purchasedBalance ?? 0,
        earnedBalance: init.earnedBalance ?? 0,
        balance: init.balance ?? (init.purchasedBalance ?? 0) + (init.earnedBalance ?? 0),
        isLocked: init.isLocked ?? false,
    };
}

function applyDelta(target: MockWallet, data: any) {
    if (data.purchasedBalance?.increment) target.purchasedBalance += data.purchasedBalance.increment;
    if (data.purchasedBalance?.decrement) target.purchasedBalance -= data.purchasedBalance.decrement;
    if (data.earnedBalance?.increment) target.earnedBalance += data.earnedBalance.increment;
    if (data.earnedBalance?.decrement) target.earnedBalance -= data.earnedBalance.decrement;
    if (data.balance?.increment) target.balance += data.balance.increment;
    if (data.balance?.decrement) target.balance -= data.balance.decrement;
    if (data.isLocked !== undefined) target.isLocked = data.isLocked;
}

function makeMockTx(store: Record<string, MockWallet>) {
    return {
        userWallet: {
            findUnique: jest.fn(async ({ where }: any) => {
                const w = store[where.userId];
                return w ? { ...w } : null;
            }),
            update: jest.fn(async ({ where, data }: any) => {
                if (!store[where.userId]) throw new Error('update on missing wallet');
                applyDelta(store[where.userId], data);
                return { ...store[where.userId] };
            }),
            upsert: jest.fn(async ({ where, update, create }: any) => {
                if (store[where.userId]) {
                    applyDelta(store[where.userId], update);
                } else {
                    store[where.userId] = makeWallet(where.userId, {
                        purchasedBalance: create.purchasedBalance ?? 0,
                        earnedBalance: create.earnedBalance ?? 0,
                        balance: create.balance ?? 0,
                    });
                }
                return { ...store[where.userId] };
            }),
        },
        coinTransaction: { create: jest.fn(async () => ({ id: 'tx' })) },
    };
}

function makeService() {
    const prisma = {} as any;
    const config = { get: () => undefined } as any;
    const notifications = { notifyUser: jest.fn(async () => undefined) } as any;
    return new WalletService(prisma, config, notifications);
}

describe('WalletService — pure helpers', () => {
    describe('splitDonation', () => {
        it('returns 0 fee at 0%', () => {
            expect(WalletService.splitDonation(100, 0)).toEqual({ fee: 0, net: 100 });
        });
        it('rounds fee UP so platform is not short-changed', () => {
            // 100 * 2% = 2 — exact, no rounding.
            expect(WalletService.splitDonation(100, 2)).toEqual({ fee: 2, net: 98 });
            // 101 * 2% = 2.02 → ceil → 3.
            expect(WalletService.splitDonation(101, 2)).toEqual({ fee: 3, net: 98 });
        });
        it('clamps fee % to 0-100', () => {
            expect(WalletService.splitDonation(100, -5)).toEqual({ fee: 0, net: 100 });
            expect(WalletService.splitDonation(100, 200)).toEqual({ fee: 100, net: 0 });
        });
    });

    describe('minNetPrice', () => {
        it('returns 1 at 0% fee', () => {
            expect(WalletService.minNetPrice(0)).toBe(1);
        });
        it('returns the smallest price that leaves the author > 0 coins', () => {
            // At 2% fee, price=50 → fee=1, net=49. price=49 → fee=1, net=48. price=2 → fee=1, net=1. price=1 → fee=1, net=0.
            // minNetPrice(2) = ceil(100/98) = 2.
            expect(WalletService.minNetPrice(2)).toBe(2);
            // At 50% fee: ceil(100/50) = 2.
            expect(WalletService.minNetPrice(50)).toBe(2);
        });
        it('caps fee % at 99 (defensive — 100% would divide-by-zero)', () => {
            expect(WalletService.minNetPrice(100)).toBe(WalletService.minNetPrice(99));
        });
    });
});

describe('WalletService — bucket helpers', () => {
    describe('creditPurchased', () => {
        it('credits purchasedBalance + balance mirror, leaves earnedBalance', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 100, earnedBalance: 50, balance: 150 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).creditPurchased(tx, 'u1', 200);
            expect(store.u1).toMatchObject({ purchasedBalance: 300, earnedBalance: 50, balance: 350 });
        });

        it('creates wallet on first credit', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {};
            const tx = makeMockTx(store);
            await (svc as any).creditPurchased(tx, 'new', 100);
            expect(store.new).toMatchObject({ purchasedBalance: 100, earnedBalance: 0, balance: 100 });
        });
    });

    describe('creditEarned', () => {
        it('credits earnedBalance + balance mirror, leaves purchasedBalance', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                a1: makeWallet('a1', { purchasedBalance: 100, earnedBalance: 50, balance: 150 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).creditEarned(tx, 'a1', 200);
            expect(store.a1).toMatchObject({ purchasedBalance: 100, earnedBalance: 250, balance: 350 });
        });

        it('creates wallet with earned-only on first credit', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {};
            const tx = makeMockTx(store);
            await (svc as any).creditEarned(tx, 'a2', 100);
            expect(store.a2).toMatchObject({ purchasedBalance: 0, earnedBalance: 100, balance: 100 });
        });
    });

    describe('debitForContent (SOFT: purchased first, fallback earned)', () => {
        it('debits purchasedBalance only when it covers the amount', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 200, earnedBalance: 100, balance: 300 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).debitForContent(tx, 'u1', 150);
            expect(store.u1).toMatchObject({ purchasedBalance: 50, earnedBalance: 100, balance: 150 });
        });

        it('falls back to earnedBalance when purchasedBalance is short', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 30, earnedBalance: 100, balance: 130 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).debitForContent(tx, 'u1', 100);
            expect(store.u1).toMatchObject({ purchasedBalance: 0, earnedBalance: 30, balance: 30 });
        });

        it('throws when purchased + earned cannot cover amount', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 30, earnedBalance: 20, balance: 50 }),
            };
            const tx = makeMockTx(store);
            await expect((svc as any).debitForContent(tx, 'u1', 100)).rejects.toThrow(BadRequestException);
            expect(store.u1).toMatchObject({ purchasedBalance: 30, earnedBalance: 20, balance: 50 });
        });

        it('throws when wallet is locked', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 1000, balance: 1000, isLocked: true }),
            };
            const tx = makeMockTx(store);
            await expect((svc as any).debitForContent(tx, 'u1', 50)).rejects.toThrow(ForbiddenException);
        });

        it('throws when wallet does not exist', async () => {
            const svc = makeService();
            const tx = makeMockTx({});
            await expect((svc as any).debitForContent(tx, 'ghost', 1)).rejects.toThrow(BadRequestException);
        });
    });

    describe('debitPurchasedStrict (TRANSFER sender)', () => {
        it('debits purchasedBalance only', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 200, earnedBalance: 50, balance: 250 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).debitPurchasedStrict(tx, 'u1', 150);
            expect(store.u1).toMatchObject({ purchasedBalance: 50, earnedBalance: 50, balance: 100 });
        });

        it('throws when purchasedBalance < amount even if earnedBalance covers the gap (anti-laundering)', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 50, earnedBalance: 500, balance: 550 }),
            };
            const tx = makeMockTx(store);
            // earnedBalance has plenty but transfer must NOT touch it.
            await expect((svc as any).debitPurchasedStrict(tx, 'u1', 100)).rejects.toThrow(BadRequestException);
            // Wallet untouched.
            expect(store.u1).toMatchObject({ purchasedBalance: 50, earnedBalance: 500, balance: 550 });
        });

        it('throws ForbiddenException when wallet is locked', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 1000, balance: 1000, isLocked: true }),
            };
            const tx = makeMockTx(store);
            await expect((svc as any).debitPurchasedStrict(tx, 'u1', 50)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('debitForWithdrawal (earned only)', () => {
        it('debits earnedBalance only', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                a1: makeWallet('a1', { purchasedBalance: 100, earnedBalance: 500, balance: 600 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).debitForWithdrawal(tx, 'a1', 200);
            expect(store.a1).toMatchObject({ purchasedBalance: 100, earnedBalance: 300, balance: 400 });
        });

        it('throws when earnedBalance < amount even if purchasedBalance covers it (IAP cannot be withdrawn)', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                a1: makeWallet('a1', { purchasedBalance: 5000, earnedBalance: 0, balance: 5000 }),
            };
            const tx = makeMockTx(store);
            await expect((svc as any).debitForWithdrawal(tx, 'a1', 1000)).rejects.toThrow(BadRequestException);
            expect(store.a1).toMatchObject({ purchasedBalance: 5000, earnedBalance: 0, balance: 5000 });
        });

        it('throws ForbiddenException when wallet is locked', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                a1: makeWallet('a1', { earnedBalance: 1000, balance: 1000, isLocked: true }),
            };
            const tx = makeMockTx(store);
            await expect((svc as any).debitForWithdrawal(tx, 'a1', 500)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('balance mirror invariant', () => {
        it('balance === purchasedBalance + earnedBalance after compound credit + debit', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {};
            const tx = makeMockTx(store);
            // Initial purchase top-up
            await (svc as any).creditPurchased(tx, 'u1', 1000);
            // Receive donation as creator
            await (svc as any).creditEarned(tx, 'u1', 500);
            // Spend on a chapter (soft)
            await (svc as any).debitForContent(tx, 'u1', 300);
            const w = store.u1;
            expect(w.balance).toBe(w.purchasedBalance + w.earnedBalance);
            // 1000 - 300 = 700 purchased, 500 earned, total 1200.
            expect(w).toMatchObject({ purchasedBalance: 700, earnedBalance: 500, balance: 1200 });
        });

        it('soft debit that crosses the bucket boundary still keeps the mirror', async () => {
            const svc = makeService();
            const store: Record<string, MockWallet> = {
                u1: makeWallet('u1', { purchasedBalance: 30, earnedBalance: 70, balance: 100 }),
            };
            const tx = makeMockTx(store);
            await (svc as any).debitForContent(tx, 'u1', 80);
            const w = store.u1;
            expect(w.balance).toBe(w.purchasedBalance + w.earnedBalance);
            expect(w).toMatchObject({ purchasedBalance: 0, earnedBalance: 20, balance: 20 });
        });
    });
});

describe('WalletService — adminDebitBucket', () => {
    it('debits the specified bucket only', async () => {
        const svc = makeService();
        const store: Record<string, MockWallet> = {
            u1: makeWallet('u1', { purchasedBalance: 500, earnedBalance: 300, balance: 800 }),
        };
        const tx = makeMockTx(store);
        await (svc as any).adminDebitBucket(tx, 'u1', 'EARNED', 100);
        expect(store.u1).toMatchObject({ purchasedBalance: 500, earnedBalance: 200, balance: 700 });
    });

    it('bypasses isLocked (admin override for fraud cleanup)', async () => {
        const svc = makeService();
        const store: Record<string, MockWallet> = {
            u1: makeWallet('u1', { purchasedBalance: 100, balance: 100, isLocked: true }),
        };
        const tx = makeMockTx(store);
        await (svc as any).adminDebitBucket(tx, 'u1', 'PURCHASED', 50);
        expect(store.u1).toMatchObject({ purchasedBalance: 50, balance: 50, isLocked: true });
    });

    it('refuses to push the bucket below zero', async () => {
        const svc = makeService();
        const store: Record<string, MockWallet> = {
            u1: makeWallet('u1', { purchasedBalance: 10, balance: 10 }),
        };
        const tx = makeMockTx(store);
        await expect((svc as any).adminDebitBucket(tx, 'u1', 'PURCHASED', 50)).rejects.toThrow(BadRequestException);
    });
});
