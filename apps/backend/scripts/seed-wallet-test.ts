// Seed test data for Phase 3a (Wallet UI) verification.
// Idempotent — chạy lại nhiều lần OK.
//
// Run: cd apps/backend && npx tsx scripts/seed-wallet-test.ts
import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_EMAIL = 'user1@hungyeu.com';

const TX_FIXTURES: Array<{
  amount: number;
  type: TransactionType;
  description: string;
}> = [
  { amount: 5000, type: 'DEPOSIT', description: 'Nạp gói 250 xu (test)' },
  { amount: -50, type: 'PURCHASE_CHAPTER', description: 'Mở chương "Chương 12"' },
  { amount: -300, type: 'PURCHASE_STORY', description: 'Mua trọn bộ "Truyện Demo"' },
  { amount: -100, type: 'DONATE_AUTHOR', description: 'Ủng hộ tác giả Demo' },
  { amount: 200, type: 'BONUS', description: 'Thưởng tân thủ' },
];

type PackageSpec = {
  coinAmount: number;
  priceVND: number;
  name: string;
  apple: string;
  google: string;
};

const PACKAGE_SPECS: PackageSpec[] = [
  { coinAmount: 50, priceVND: 10000, name: 'Gói 50 xu', apple: 'com.hungyeu.coin50', google: 'com.hungyeu.coin50' },
  { coinAmount: 250, priceVND: 50000, name: 'Gói 250 xu', apple: 'com.hungyeu.coin250', google: 'com.hungyeu.coin250' },
  { coinAmount: 500, priceVND: 100000, name: 'Gói 500 xu', apple: 'com.hungyeu.coin500', google: 'com.hungyeu.coin500' },
  { coinAmount: 1500, priceVND: 200000, name: 'Gói 1500 xu', apple: 'com.hungyeu.coin1500', google: 'com.hungyeu.coin1500' },
];

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { id: true, email: true, username: true },
  });
  if (!user) {
    throw new Error(`User test ${TEST_EMAIL} không tồn tại. Chạy seed chính trước (npm run prisma:seed).`);
  }
  console.log(`[seed-wallet-test] user: ${user.email} (${user.id})`);

  const wallet = await prisma.userWallet.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      purchasedBalance: 5000,
      earnedBalance: 1200,
      balance: 6200,
    },
    update: {
      purchasedBalance: 5000,
      earnedBalance: 1200,
      balance: 6200,
      isLocked: false,
    },
  });
  console.log(`[seed-wallet-test] wallet: ${wallet.id} (purchased=${wallet.purchasedBalance}, earned=${wallet.earnedBalance})`);

  await prisma.coinTransaction.deleteMany({
    where: { walletId: wallet.id, description: { contains: '(test)' } },
  });

  const now = Date.now();
  for (let i = 0; i < TX_FIXTURES.length; i++) {
    const fx = TX_FIXTURES[i];
    const description = fx.description.endsWith('(test)') ? fx.description : `${fx.description} (test)`;
    await prisma.coinTransaction.create({
      data: {
        walletId: wallet.id,
        amount: fx.amount,
        type: fx.type,
        description,
        createdAt: new Date(now - (TX_FIXTURES.length - i) * 60 * 60 * 1000),
      },
    });
  }
  console.log(`[seed-wallet-test] inserted ${TX_FIXTURES.length} coin transactions`);

  let created = 0;
  let updated = 0;
  for (const spec of PACKAGE_SPECS) {
    const existing = await prisma.coinPackage.findUnique({ where: { appleProductId: spec.apple } });
    if (existing) {
      await prisma.coinPackage.update({
        where: { id: existing.id },
        data: {
          name: spec.name,
          coinAmount: spec.coinAmount,
          priceVND: spec.priceVND,
          googleProductId: spec.google,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.coinPackage.create({
        data: {
          name: spec.name,
          coinAmount: spec.coinAmount,
          priceVND: spec.priceVND,
          appleProductId: spec.apple,
          googleProductId: spec.google,
          isActive: true,
        },
      });
      created++;
    }
  }
  console.log(`[seed-wallet-test] coin packages: created=${created}, updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
