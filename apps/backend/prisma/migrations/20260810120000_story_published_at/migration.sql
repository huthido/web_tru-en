-- Cột thời điểm truyện được duyệt/xuất bản LẦN ĐẦU.
-- "Mới nhất" trang chủ + /truyen sort theo cột này thay vì createdAt,
-- để truyện viết lâu nhưng mới được duyệt vẫn lên đầu danh sách.
ALTER TABLE "stories" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill truyện đã publish: lấy ngày duyệt thật (reviewedAt sớm nhất của
-- request STORY_PUBLISH đã APPROVED); truyện không có request (admin tự đăng,
-- import) thì đành lấy createdAt.
UPDATE "stories" s
SET "publishedAt" = COALESCE(
    (
        SELECT MIN(ar."reviewedAt")
        FROM "approval_requests" ar
        WHERE ar."storyId" = s."id"
          AND ar."type" = 'STORY_PUBLISH'
          AND ar."status" = 'APPROVED'
    ),
    s."createdAt"
)
WHERE s."isPublished" = true;

CREATE INDEX "stories_publishedAt_idx" ON "stories"("publishedAt");
