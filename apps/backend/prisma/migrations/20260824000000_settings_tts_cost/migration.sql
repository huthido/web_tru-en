-- Giọng đọc AI: tắt tự sinh khi xuất bản (admin bật lại trong Cài đặt) và
-- phí xu mỗi chương khi tác giả tự bấm tạo (0 = miễn phí).
ALTER TABLE "settings" ADD COLUMN "ttsAutoGenerateOnPublish" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "settings" ADD COLUMN "ttsGenerationCoinCost" INTEGER NOT NULL DEFAULT 0;

-- Loại giao dịch mới: trừ xu tác giả khi sinh giọng đọc AI.
ALTER TYPE "TransactionType" ADD VALUE 'TTS_GENERATION';
