-- Apple §1.2 — report UGC + block user.
-- Tên bảng + enum đặt tiền tố "ugc" / "Ugc" để tránh đụng với ContentReport
-- và ReportStatus đã có sẵn (init_fix).

CREATE TYPE "UgcReportTargetType" AS ENUM ('STORY', 'CHAPTER', 'COMMENT', 'USER');
CREATE TYPE "UgcReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

CREATE TABLE "ugc_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "UgcReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" "UgcReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    CONSTRAINT "ugc_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ugc_reports_targetType_targetId_idx" ON "ugc_reports"("targetType", "targetId");
CREATE INDEX "ugc_reports_status_idx" ON "ugc_reports"("status");
CREATE INDEX "ugc_reports_createdAt_idx" ON "ugc_reports"("createdAt");

ALTER TABLE "ugc_reports" ADD CONSTRAINT "ugc_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ugc_reports" ADD CONSTRAINT "ugc_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");
CREATE INDEX "user_blocks_blockerId_idx" ON "user_blocks"("blockerId");
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
