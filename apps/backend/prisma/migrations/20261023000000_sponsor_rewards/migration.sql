-- Quỹ thưởng tài trợ (pha 1). Dùng IF NOT EXISTS / DO-block để chạy lại được.
DO $$ BEGIN
  CREATE TYPE "SponsorRewardType" AS ENUM ('PRODUCT', 'CASH', 'STORY_ACCESS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "SponsorClaimStatus" AS ENUM ('PENDING', 'FULFILLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "sponsor_programs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sponsorName" TEXT NOT NULL,
    "sponsorLogo" TEXT,
    "rewardType" "SponsorRewardType" NOT NULL,
    "rewardNote" TEXT NOT NULL,
    "storyId" TEXT,
    "slots" INTEGER NOT NULL,
    "claimedCount" INTEGER NOT NULL DEFAULT 0,
    "requiredCheckinDays" INTEGER NOT NULL DEFAULT 0,
    "requiredMissionDays" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sponsor_programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sponsor_claims" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contact" TEXT,
    "status" "SponsorClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    CONSTRAINT "sponsor_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sponsor_programs_isActive_endsAt_idx" ON "sponsor_programs"("isActive", "endsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "sponsor_claims_programId_userId_key" ON "sponsor_claims"("programId", "userId");
CREATE INDEX IF NOT EXISTS "sponsor_claims_userId_idx" ON "sponsor_claims"("userId");

DO $$ BEGIN
  ALTER TABLE "sponsor_programs" ADD CONSTRAINT "sponsor_programs_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "sponsor_claims" ADD CONSTRAINT "sponsor_claims_programId_fkey" FOREIGN KEY ("programId") REFERENCES "sponsor_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "sponsor_claims" ADD CONSTRAINT "sponsor_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
