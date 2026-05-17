-- Add platform fee / author-net breakdown to chapter purchases.
-- Mirrors the author_donations split so chapter sales credit the author
-- (net) while the platform retains donationPlatformFeePercent of the price.
--
-- Existing rows: before this migration the spent coins were not credited to
-- anyone. We back-fill them consistently with the donation migration —
-- treat the historical purchase as 100% to the author (netAmount = pricePaid,
-- platformFee = 0) so revenue reporting has sane historical numbers.

ALTER TABLE "chapter_purchases"
  ADD COLUMN "platformFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "netAmount"   INTEGER NOT NULL DEFAULT 0;

-- Back-fill historical rows.
UPDATE "chapter_purchases" SET "netAmount" = "pricePaid" WHERE "netAmount" = 0;
