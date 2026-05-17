-- Spec mục 17 — author withdrawal requests.
--
-- Additive & safe. Coins are held (debited) at request time via a WITHDRAWAL
-- CoinTransaction; rejection refunds via a REFUND transaction. settings gains
-- a configurable minimum (default 1000, matching the spec example).

CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';

ALTER TABLE "settings"
  ADD COLUMN "minWithdrawalCoins" INTEGER NOT NULL DEFAULT 1000;

CREATE TABLE "withdrawal_requests" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "amount"            INTEGER NOT NULL,
  "status"            "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "bankName"          TEXT NOT NULL,
  "bankAccountNumber" TEXT NOT NULL,
  "bankAccountName"   TEXT NOT NULL,
  "note"              TEXT,
  "processedById"     TEXT,
  "processedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "withdrawal_requests_userId_idx" ON "withdrawal_requests"("userId");
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");
CREATE INDEX "withdrawal_requests_createdAt_idx" ON "withdrawal_requests"("createdAt");

ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "withdrawal_requests"
  ADD CONSTRAINT "withdrawal_requests_processedById_fkey"
  FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
