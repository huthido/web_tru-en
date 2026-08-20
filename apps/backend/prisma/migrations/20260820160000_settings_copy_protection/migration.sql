-- Toggle admin: chống copy nội dung chương trên trang đọc (mặc định bật).
ALTER TABLE "settings" ADD COLUMN "copyProtectionEnabled" BOOLEAN NOT NULL DEFAULT true;
