-- Spec mục 2 — user-to-user coin transfer + admin wallet lock.
--
-- Additive & safe: user_wallets.isLocked defaults false (no behaviour change),
-- settings.allowCoinTransfer defaults false (transfer disabled until an admin
-- enables it). TRANSFER is a new TransactionType used at runtime only.

ALTER TABLE "user_wallets"
  ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "settings"
  ADD COLUMN "allowCoinTransfer" BOOLEAN NOT NULL DEFAULT false;

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER';
