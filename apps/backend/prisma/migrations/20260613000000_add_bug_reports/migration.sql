-- CreateEnum
CREATE TYPE "BugReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BugPlatform" AS ENUM ('WEB', 'ANDROID', 'IOS', 'OTHER');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "bug_reports" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "platform" "BugPlatform" NOT NULL DEFAULT 'WEB',
    "severity" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BugReportStatus" NOT NULL DEFAULT 'OPEN',
    "pageUrl" VARCHAR(500),
    "deviceInfo" VARCHAR(500),
    "appVersion" VARCHAR(50),
    "adminNote" TEXT,
    "reporterId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_reports_status_idx" ON "bug_reports"("status");

-- CreateIndex
CREATE INDEX "bug_reports_platform_idx" ON "bug_reports"("platform");

-- CreateIndex
CREATE INDEX "bug_reports_createdAt_idx" ON "bug_reports"("createdAt");

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
