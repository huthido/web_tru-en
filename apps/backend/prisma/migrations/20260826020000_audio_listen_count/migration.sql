-- Chuyển lượt nghe sang ĐẾM MỖI LẦN BẤM NÚT (client-side) cho ổn định, không
-- dedupe theo IP nữa (coolify-proxy làm mất IP thật của khách). Bỏ ràng buộc
-- unique + cột listenerKey/ipAddress không còn dùng. Bảng đang trống nên an toàn.
DROP INDEX IF EXISTS "audio_listens_chapterId_listenerKey_key";
ALTER TABLE "audio_listens" DROP COLUMN IF EXISTS "listenerKey";
ALTER TABLE "audio_listens" DROP COLUMN IF EXISTS "ipAddress";
