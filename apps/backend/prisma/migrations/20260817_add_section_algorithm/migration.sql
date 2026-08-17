-- AlterTable
ALTER TABLE "homepage_sections" ADD COLUMN "algorithm" TEXT NOT NULL DEFAULT 'newest';

-- Backfill: map sortPath → algorithm
UPDATE "homepage_sections" SET "algorithm" = 'newest'        WHERE "sortPath" = 'newest';
UPDATE "homepage_sections" SET "algorithm" = 'best-of-month' WHERE "sortPath" = 'best-of-month';
UPDATE "homepage_sections" SET "algorithm" = 'top-rated'     WHERE "sortPath" = 'top-rated';
UPDATE "homepage_sections" SET "algorithm" = 'recommended'   WHERE "sortPath" = 'recommended';
UPDATE "homepage_sections" SET "algorithm" = 'most-liked'    WHERE "sortPath" = 'most-liked';
