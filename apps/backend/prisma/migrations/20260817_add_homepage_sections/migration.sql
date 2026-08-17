-- CreateTable
CREATE TABLE "homepage_sections" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortPath" TEXT NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 15,
    "seeMorePath" TEXT DEFAULT '/truyen',
    "sortBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homepage_sections_key_key" ON "homepage_sections"("key");

-- CreateIndex
CREATE INDEX "homepage_sections_isActive_idx" ON "homepage_sections"("isActive");

-- CreateIndex
CREATE INDEX "homepage_sections_order_idx" ON "homepage_sections"("order");
