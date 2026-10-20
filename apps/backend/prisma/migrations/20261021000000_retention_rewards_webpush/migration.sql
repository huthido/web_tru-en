-- Phase 3 giữ chân người đọc: ví xu thưởng (bonusBalance), điểm danh, nhiệm vụ ngày,
-- mời bạn, giftcode, thể loại yêu thích, đăng ký Web Push. Toàn bộ là thêm mới
-- (additive) — không đổi/xoá dữ liệu cũ.

-- AlterEnum


ALTER TYPE "TransactionType" ADD VALUE 'CHECKIN_REWARD';
ALTER TYPE "TransactionType" ADD VALUE 'MISSION_REWARD';
ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_REWARD';
ALTER TYPE "TransactionType" ADD VALUE 'GIFTCODE_REWARD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "favoriteCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "genreOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralRewardedAt" TIMESTAMP(3),
ADD COLUMN     "referredById" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "checkinRewards" JSONB NOT NULL DEFAULT '[2,2,3,3,5,5,10]',
ADD COLUMN     "dailyMissions" JSONB NOT NULL DEFAULT '[{"key":"read","target":3,"reward":5},{"key":"listen","target":1,"reward":3},{"key":"comment","target":1,"reward":2}]',
ADD COLUMN     "referralEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "referralMonthlyCap" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "referralRewardReferee" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "referralRewardReferrer" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "rewardsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user_wallets" ADD COLUMN     "bonusBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "chapter_purchases" ADD COLUMN     "bonusPaid" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "story_purchases" ADD COLUMN     "bonusPaid" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "daily_check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "streak" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mission_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "missionKey" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_mission_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_code_redemptions" (
    "id" TEXT NOT NULL,
    "giftCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_check_ins_userId_createdAt_idx" ON "daily_check_ins"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_check_ins_userId_day_key" ON "daily_check_ins"("userId", "day");

-- CreateIndex
CREATE INDEX "user_daily_activities_userId_day_idx" ON "user_daily_activities"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_activities_userId_day_kind_refId_key" ON "user_daily_activities"("userId", "day", "kind", "refId");

-- CreateIndex
CREATE INDEX "user_mission_claims_userId_idx" ON "user_mission_claims"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_mission_claims_userId_day_missionKey_key" ON "user_mission_claims"("userId", "day", "missionKey");

-- CreateIndex
CREATE UNIQUE INDEX "gift_codes_code_key" ON "gift_codes"("code");

-- CreateIndex
CREATE INDEX "gift_code_redemptions_userId_idx" ON "gift_code_redemptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_code_redemptions_giftCodeId_userId_key" ON "gift_code_redemptions"("giftCodeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_userId_idx" ON "web_push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_referredById_idx" ON "users"("referredById");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_check_ins" ADD CONSTRAINT "daily_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_activities" ADD CONSTRAINT "user_daily_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mission_claims" ADD CONSTRAINT "user_mission_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_codes" ADD CONSTRAINT "gift_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_giftCodeId_fkey" FOREIGN KEY ("giftCodeId") REFERENCES "gift_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_redemptions" ADD CONSTRAINT "gift_code_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Xu thưởng không bao giờ âm (giống purchased/earned).
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_bonusBalance_nonneg" CHECK ("bonusBalance" >= 0);
