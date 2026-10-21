-- Like bình luận + loại thông báo @nhắc tên / tác giả ra truyện mới.
--
-- LƯU Ý: DB production đã có sẵn cột comments."likeCount", comments."isPinned"
-- và 4 index isPinned (thêm ngoài migration — lệch schema). Mọi lệnh dưới đây
-- dùng IF NOT EXISTS để chạy được cả trên prod lẫn DB mới, và isPinned nay
-- được khai báo trong schema.prisma cho khớp.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMENT_MENTION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTHOR_NEW_STORY';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex (khớp tên index đang có trên prod)
CREATE INDEX IF NOT EXISTS "comments_isPinned_idx" ON "comments"("isPinned");
CREATE INDEX IF NOT EXISTS "comments_isPinned_createdAt_idx" ON "comments"("isPinned", "createdAt");
CREATE INDEX IF NOT EXISTS "comments_storyId_isPinned_createdAt_idx" ON "comments"("storyId", "isPinned", "createdAt");
CREATE INDEX IF NOT EXISTS "comments_chapterId_isPinned_createdAt_idx" ON "comments"("chapterId", "isPinned", "createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "comment_likes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "comment_likes_userId_idx" ON "comment_likes"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_commentId_userId_key" ON "comment_likes"("commentId", "userId");

-- AddForeignKey (bỏ qua nếu đã có)
DO $$ BEGIN
    ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- likeCount cũ trên prod không có bản ghi like đi kèm → đồng bộ lại theo bảng like.
UPDATE "comments" c
SET "likeCount" = (SELECT COUNT(*) FROM "comment_likes" l WHERE l."commentId" = c."id")
WHERE c."likeCount" <> (SELECT COUNT(*) FROM "comment_likes" l WHERE l."commentId" = c."id");

-- Bảng xếp hạng theo kỳ: groupBy storyId trong cửa sổ createdAt.
CREATE INDEX IF NOT EXISTS "view_logs_createdAt_storyId_idx" ON "view_logs"("createdAt", "storyId");
