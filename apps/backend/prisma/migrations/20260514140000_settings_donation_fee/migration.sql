-- Make donation platform fee configurable via Settings.
-- Existing row keeps the default 2 (which matches the previous hard-coded constant)
-- so behaviour is unchanged on upgrade.

ALTER TABLE "settings"
  ADD COLUMN "donationPlatformFeePercent" INTEGER NOT NULL DEFAULT 2;
