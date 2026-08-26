-- Lượt NGHE truyện (bấm play audio tác giả / giọng AI / Web Speech), đếm DUY
-- NHẤT theo (chương × người nghe) qua listenerKey. Dùng cho thống kê lượt nghe
-- theo truyện, theo chương và theo người dùng.
CREATE TABLE "audio_listens" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT,
    "listenerKey" TEXT NOT NULL,
    "source" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_listens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audio_listens_chapterId_listenerKey_key" ON "audio_listens"("chapterId", "listenerKey");
CREATE INDEX "audio_listens_storyId_idx" ON "audio_listens"("storyId");
CREATE INDEX "audio_listens_chapterId_idx" ON "audio_listens"("chapterId");
CREATE INDEX "audio_listens_userId_idx" ON "audio_listens"("userId");
CREATE INDEX "audio_listens_createdAt_idx" ON "audio_listens"("createdAt");

ALTER TABLE "audio_listens" ADD CONSTRAINT "audio_listens_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audio_listens" ADD CONSTRAINT "audio_listens_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audio_listens" ADD CONSTRAINT "audio_listens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
