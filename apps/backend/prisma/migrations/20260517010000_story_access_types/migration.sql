-- Spec mục 4 — story access types (FREE / FREEMIUM / VIP).
--
-- Additive & safe: every existing story defaults to FREE (current behaviour
-- unchanged) and price 0. story_purchases mirrors chapter_purchases for the
-- VIP whole-story unlock. PURCHASE_STORY is a new TransactionType value used
-- only at runtime (no DDL here depends on it, so adding it in this migration
-- is safe on PostgreSQL 12+).

-- New enum for the access type.
CREATE TYPE "StoryAccessType" AS ENUM ('FREE', 'FREEMIUM', 'VIP');

-- New transaction type value for VIP story purchases.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PURCHASE_STORY';

-- Story gains access type + VIP price.
ALTER TABLE "stories"
  ADD COLUMN "accessType" "StoryAccessType" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "price"      INTEGER           NOT NULL DEFAULT 0;

-- VIP whole-story purchase records (one row unlocks all chapters for a buyer).
CREATE TABLE "story_purchases" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "storyId"     TEXT NOT NULL,
  "pricePaid"   INTEGER NOT NULL,
  "platformFee" INTEGER NOT NULL DEFAULT 0,
  "netAmount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "story_purchases_userId_storyId_key" ON "story_purchases"("userId", "storyId");
CREATE INDEX "story_purchases_userId_idx" ON "story_purchases"("userId");
CREATE INDEX "story_purchases_storyId_idx" ON "story_purchases"("storyId");
CREATE INDEX "story_purchases_createdAt_idx" ON "story_purchases"("createdAt");

ALTER TABLE "story_purchases"
  ADD CONSTRAINT "story_purchases_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_purchases"
  ADD CONSTRAINT "story_purchases_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
