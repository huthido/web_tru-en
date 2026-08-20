-- Giọng đọc AI của tác giả: clip mẫu để clone (ttsVoiceUrl, ưu tiên) hoặc
-- giọng preset VieNeu tự chọn (ttsVoicePreset). NULL cả hai = giọng mặc định.
ALTER TABLE "users"
    ADD COLUMN "ttsVoiceUrl" TEXT,
    ADD COLUMN "ttsVoicePreset" TEXT;
