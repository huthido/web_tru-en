-- AlterTable: add allowedImageDomains to settings
ALTER TABLE "settings" ADD COLUMN "allowedImageDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
