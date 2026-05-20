-- Spec mục 17: split chapter/story sale rev-share from donation rev-share so
-- admin can tune them independently. Backfill copies the current donation %
-- so existing pricing/UX is preserved exactly until admin changes it.

ALTER TABLE "settings"
  ADD COLUMN "chapterSaleFeePercent" INTEGER NOT NULL DEFAULT 2;

UPDATE "settings"
   SET "chapterSaleFeePercent" = "donationPlatformFeePercent";
