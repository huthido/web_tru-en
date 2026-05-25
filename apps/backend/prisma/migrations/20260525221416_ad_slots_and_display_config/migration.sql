-- AlterTable
ALTER TABLE "ads" ADD COLUMN     "displayConfig" JSONB,
ADD COLUMN     "inlineRule" JSONB;

-- CreateTable
CREATE TABLE "ad_slots" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "position" "AdPosition" NOT NULL,
    "label" TEXT NOT NULL,
    "maxAds" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "adType" "AdType",
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_slot_bindings" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_slot_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_slots_key_key" ON "ad_slots"("key");

-- CreateIndex
CREATE INDEX "ad_slots_pageKey_enabled_idx" ON "ad_slots"("pageKey", "enabled");

-- CreateIndex
CREATE INDEX "ad_slots_key_idx" ON "ad_slots"("key");

-- CreateIndex
CREATE INDEX "ad_slot_bindings_slotId_idx" ON "ad_slot_bindings"("slotId");

-- CreateIndex
CREATE INDEX "ad_slot_bindings_adId_idx" ON "ad_slot_bindings"("adId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_slot_bindings_adId_slotId_key" ON "ad_slot_bindings"("adId", "slotId");

-- AddForeignKey
ALTER TABLE "ad_slot_bindings" ADD CONSTRAINT "ad_slot_bindings_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_slot_bindings" ADD CONSTRAINT "ad_slot_bindings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ad_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
