-- Giọng đọc AI: chuyển từ thu xu THEO CHƯƠNG sang GÓI THÁNG cho tác giả.
-- Bỏ cột phí/chương (không đổi tên để giá cũ theo chương không âm thầm
-- thành giá tháng) và thêm cột phí gói tháng, mặc định 0 = miễn phí.
ALTER TABLE "settings" DROP COLUMN "ttsGenerationCoinCost";
ALTER TABLE "settings" ADD COLUMN "ttsSubscriptionCoinCost" INTEGER NOT NULL DEFAULT 0;

-- Hạn gói tháng của từng tác giả (NULL = chưa mua).
ALTER TABLE "users" ADD COLUMN "ttsSubscriptionExpiresAt" TIMESTAMP(3);

-- Loại giao dịch mua gói tháng (TTS_GENERATION cũ giữ nguyên cho lịch sử).
ALTER TYPE "TransactionType" ADD VALUE 'TTS_SUBSCRIPTION';
