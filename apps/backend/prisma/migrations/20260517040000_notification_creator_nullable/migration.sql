-- Realtime/auto notifications (spec mục 3) — donate/sale/withdrawal events
-- create notifications with no human creator. Make notifications.createdById
-- nullable and the FK ON DELETE SET NULL. Safe: existing rows keep their
-- creator; no data loss.

ALTER TABLE "notifications" ALTER COLUMN "createdById" DROP NOT NULL;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_createdById_fkey";
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
