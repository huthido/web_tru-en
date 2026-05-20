-- Apple §3.1.1 / Google Play Billing §4.3 compliance.
-- Split user_wallets.balance into two buckets:
--   purchasedBalance : bought via VNPay/Apple IAP/Google Play → spendable, NOT withdrawable
--   earnedBalance    : received from chapter/story sales, donations → withdrawable as VND
-- Legacy "balance" kept as denormalized total during transition; dropped in follow-up.
-- Backfill: all existing balance → purchasedBalance (conservative — no historical
-- coin can be proven as "earned", so treating them as bought is the Apple-safe choice).

BEGIN;

ALTER TABLE "user_wallets"
  ADD COLUMN "purchasedBalance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "earnedBalance"    INTEGER NOT NULL DEFAULT 0;

UPDATE "user_wallets"
   SET "purchasedBalance" = "balance",
       "earnedBalance"    = 0
 WHERE "balance" > 0;

ALTER TABLE "user_wallets"
  ADD CONSTRAINT "user_wallets_purchasedBalance_nonneg" CHECK ("purchasedBalance" >= 0),
  ADD CONSTRAINT "user_wallets_earnedBalance_nonneg"    CHECK ("earnedBalance"    >= 0);

CREATE INDEX "user_wallets_earnedBalance_idx" ON "user_wallets" ("earnedBalance");

COMMIT;
