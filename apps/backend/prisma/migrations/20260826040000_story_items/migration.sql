-- Vật phẩm truyện bán bằng xu: tác giả tạo vật phẩm (ảnh + mô tả + file tuỳ
-- chọn), người đọc mua nhiều lần bằng xu, tồn kho tuỳ chọn, chia doanh thu.
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PURCHASE_ITEM';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ITEM_PURCHASED';

CREATE TABLE "story_items" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "fileUrl" TEXT,
    "price" INTEGER NOT NULL,
    "stock" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "story_items_storyId_isActive_idx" ON "story_items"("storyId", "isActive");
CREATE INDEX "story_items_authorId_idx" ON "story_items"("authorId");
ALTER TABLE "story_items" ADD CONSTRAINT "story_items_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_items" ADD CONSTRAINT "story_items_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "story_item_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricePaid" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_item_purchases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "story_item_purchases_userId_idx" ON "story_item_purchases"("userId");
CREATE INDEX "story_item_purchases_itemId_idx" ON "story_item_purchases"("itemId");
CREATE INDEX "story_item_purchases_storyId_idx" ON "story_item_purchases"("storyId");
CREATE INDEX "story_item_purchases_createdAt_idx" ON "story_item_purchases"("createdAt");
ALTER TABLE "story_item_purchases" ADD CONSTRAINT "story_item_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_item_purchases" ADD CONSTRAINT "story_item_purchases_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "story_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_item_purchases" ADD CONSTRAINT "story_item_purchases_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
