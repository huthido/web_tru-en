-- AlterTable: Thêm 3 cột audio scroll sync vào Settings
ALTER TABLE "settings" ADD COLUMN "audioScrollSyncEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "settings" ADD COLUMN "audioScrollSyncAuthorAudio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "settings" ADD COLUMN "audioScrollSyncWebSpeech" BOOLEAN NOT NULL DEFAULT false;
