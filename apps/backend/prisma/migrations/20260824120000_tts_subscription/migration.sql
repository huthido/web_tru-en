-- Giọng đọc AI: chuyển từ thu xu THEO CHƯƠNG sang GÓI THÁNG cho tác giả.
-- Bỏ cột phí/chương và thêm bảng giá gói: JSON [{months, coins}], mặc định
-- rỗng = miễn phí (admin thêm mức giá trong Cài đặt).
ALTER TABLE "settings" DROP COLUMN "ttsGenerationCoinCost";
ALTER TABLE "settings" ADD COLUMN "ttsSubscriptionPlans" JSONB NOT NULL DEFAULT '[]';

-- Hạn gói tháng của từng tác giả (NULL = chưa mua).
ALTER TABLE "users" ADD COLUMN "ttsSubscriptionExpiresAt" TIMESTAMP(3);

-- Loại giao dịch mua gói tháng (TTS_GENERATION cũ giữ nguyên cho lịch sử).
ALTER TYPE "TransactionType" ADD VALUE 'TTS_SUBSCRIPTION';
