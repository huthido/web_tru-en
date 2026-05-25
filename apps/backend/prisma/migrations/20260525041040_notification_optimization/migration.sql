-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'STORY_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_NEW_CHAPTER';
ALTER TYPE "NotificationType" ADD VALUE 'DONATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'CHAPTER_PURCHASED';
ALTER TYPE "NotificationType" ADD VALUE 'STORY_PURCHASED';
ALTER TYPE "NotificationType" ADD VALUE 'WITHDRAWAL_PROCESSED';
ALTER TYPE "NotificationType" ADD VALUE 'COIN_TRANSFER_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'COIN_DEPOSITED';
ALTER TYPE "NotificationType" ADD VALUE 'COMMENT_REPLY';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actionUrl" VARCHAR(500);

-- CreateTable
CREATE TABLE "user_push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_push_tokens_token_key" ON "user_push_tokens"("token");

-- CreateIndex
CREATE INDEX "user_push_tokens_userId_idx" ON "user_push_tokens"("userId");

-- AddForeignKey
ALTER TABLE "user_push_tokens" ADD CONSTRAINT "user_push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
