-- Lượt xem bài Nghệ thuật + tim tranh (bảng like theo người dùng).
ALTER TABLE "art_posts" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "painting_likes" (
    "userId" TEXT NOT NULL,
    "paintingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "painting_likes_pkey" PRIMARY KEY ("userId","paintingId")
);

CREATE INDEX IF NOT EXISTS "painting_likes_paintingId_idx" ON "painting_likes"("paintingId");

DO $$ BEGIN
  ALTER TABLE "painting_likes" ADD CONSTRAINT "painting_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "painting_likes" ADD CONSTRAINT "painting_likes_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "paintings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
