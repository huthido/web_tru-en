-- Toggle admin: cho phép độc giả tải xuống file audio chương (mặc định tắt).
ALTER TABLE "settings" ADD COLUMN "chapterAudioDownloadEnabled" BOOLEAN NOT NULL DEFAULT false;
