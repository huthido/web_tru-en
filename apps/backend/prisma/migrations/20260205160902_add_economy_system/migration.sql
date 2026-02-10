-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'PURCHASE_CHAPTER', 'ADMIN_ADJUST', 'REFUND', 'BONUS');

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "priceVND" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_userId_key" ON "user_wallets"("userId");

-- CreateIndex
CREATE INDEX "coin_transactions_walletId_idx" ON "coin_transactions"("walletId");

-- CreateIndex
CREATE INDEX "coin_transactions_type_idx" ON "coin_transactions"("type");

-- CreateIndex
CREATE INDEX "coin_transactions_createdAt_idx" ON "coin_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "chapter_purchases_userId_idx" ON "chapter_purchases"("userId");

-- CreateIndex
CREATE INDEX "chapter_purchases_chapterId_idx" ON "chapter_purchases"("chapterId");

-- CreateIndex
CREATE INDEX "chapter_purchases_createdAt_idx" ON "chapter_purchases"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_purchases_userId_chapterId_key" ON "chapter_purchases"("userId", "chapterId");

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "user_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_purchases" ADD CONSTRAINT "chapter_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_purchases" ADD CONSTRAINT "chapter_purchases_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
