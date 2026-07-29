-- Gian hàng tranh (model Painting) — feature đã có code từ commit b7d6e76
-- nhưng thiếu migration, nên bảng chưa từng tồn tại trên DB production.

-- CreateEnum
CREATE TYPE "PaintingStatus" AS ENUM ('AVAILABLE', 'SOLD');

-- CreateTable
CREATE TABLE "paintings" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "price" INTEGER,
    "contactInfo" JSONB,
    "status" "PaintingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paintings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paintings_authorId_idx" ON "paintings"("authorId");
CREATE INDEX "paintings_status_createdAt_idx" ON "paintings"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "paintings" ADD CONSTRAINT "paintings_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
