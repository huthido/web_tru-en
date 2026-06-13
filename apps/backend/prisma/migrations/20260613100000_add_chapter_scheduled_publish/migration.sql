-- AlterTable
ALTER TABLE "chapters" ADD COLUMN "scheduledPublishAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "chapters_isPublished_scheduledPublishAt_idx" ON "chapters"("isPublished", "scheduledPublishAt");
