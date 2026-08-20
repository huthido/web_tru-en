-- Audio AI (VieNeu-TTS) cho chương: URL file đã sinh + trạng thái job.
CREATE TYPE "TtsAudioStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

ALTER TABLE "chapters"
    ADD COLUMN "ttsAudioUrl" TEXT,
    ADD COLUMN "ttsAudioStatus" "TtsAudioStatus";
