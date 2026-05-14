-- Add platform fee breakdown to author donations.
-- Existing rows (where 100% went to the author) are back-filled so reporting stays accurate:
--   netAmount = amount, platformFee = 0
-- New donations from the v2 logic will write proper splits (amount = fee + net).

ALTER TABLE "author_donations"
  ADD COLUMN "platformFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "netAmount"   INTEGER NOT NULL DEFAULT 0;

-- Back-fill historical rows: prior to this migration, the entire amount went to the author.
UPDATE "author_donations" SET "netAmount" = "amount" WHERE "netAmount" = 0;
