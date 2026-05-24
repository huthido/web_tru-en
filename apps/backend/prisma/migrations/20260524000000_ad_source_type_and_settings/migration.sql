-- Migration: Mở rộng Ad để hỗ trợ 3rd-party ad networks + Settings ads config.
-- Backwards-compatible: rows cũ giữ sourceType=SELF_SERVED, imageUrl giữ NOT NULL
-- với default '' (rows hiện tại đã có giá trị).

-- 1. AdSourceType enum
CREATE TYPE "AdSourceType" AS ENUM ('SELF_SERVED', 'GOOGLE_ADSENSE', 'GOOGLE_ADMOB', 'FAN', 'CUSTOM_SCRIPT');

-- 2. Thêm cột vào ads
ALTER TABLE "ads"
    ADD COLUMN "sourceType" "AdSourceType" NOT NULL DEFAULT 'SELF_SERVED',
    ADD COLUMN "networkConfig" JSONB,
    ADD COLUMN "platform" TEXT;

-- 3. Đổi imageUrl: giữ NOT NULL nhưng cho default '' (backwards-compat, không phá rows cũ
-- vốn đã có URL). Tầng DTO sẽ enforce required tuỳ theo sourceType.
ALTER TABLE "ads" ALTER COLUMN "imageUrl" SET DEFAULT '';

-- 4. Indexes cho query theo sourceType + platform
CREATE INDEX "ads_sourceType_idx" ON "ads"("sourceType");
CREATE INDEX "ads_platform_idx" ON "ads"("platform");

-- 5. Thêm cột ads config vào settings
ALTER TABLE "settings"
    ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "googleAdsensePublisherId" TEXT,
    ADD COLUMN "admobAndroidAppId" TEXT,
    ADD COLUMN "admobIosAppId" TEXT,
    ADD COLUMN "fanPlacementId" TEXT,
    ADD COLUMN "adsTxtContent" TEXT,
    ADD COLUMN "consentRequired" BOOLEAN NOT NULL DEFAULT true;
