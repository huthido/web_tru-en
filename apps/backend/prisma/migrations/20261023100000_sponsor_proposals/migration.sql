-- Quỹ tài trợ pha 2+3: nhà tài trợ tự gửi đề xuất (duyệt) + chống gửi thông báo trùng.
DO $$ BEGIN
  CREATE TYPE "SponsorApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "sponsor_programs" ADD COLUMN IF NOT EXISTS "approvalStatus" "SponsorApprovalStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "sponsor_programs" ADD COLUMN IF NOT EXISTS "submittedById" TEXT;
ALTER TABLE "sponsor_programs" ADD COLUMN IF NOT EXISTS "contactInfo" TEXT;
ALTER TABLE "sponsor_programs" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;

CREATE INDEX IF NOT EXISTS "sponsor_programs_submittedById_idx" ON "sponsor_programs"("submittedById");

DO $$ BEGIN
  ALTER TABLE "sponsor_programs" ADD CONSTRAINT "sponsor_programs_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "sponsor_notices" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sponsor_notices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sponsor_notices_programId_userId_kind_key" ON "sponsor_notices"("programId", "userId", "kind");
DO $$ BEGIN
  ALTER TABLE "sponsor_notices" ADD CONSTRAINT "sponsor_notices_programId_fkey" FOREIGN KEY ("programId") REFERENCES "sponsor_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
