-- Phân loại độ tuổi nội dung (Google Play Families Policy)
--  ALL    : phù hợp mọi lứa tuổi (mặc định)
--  MATURE : nội dung người lớn — ẩn với tài khoản chưa bật xem nội dung người lớn
CREATE TYPE "StoryMaturity" AS ENUM ('ALL', 'MATURE');

ALTER TABLE "stories" ADD COLUMN "maturity" "StoryMaturity" NOT NULL DEFAULT 'ALL';

-- Quyền xem nội dung người lớn do phụ huynh/người giám hộ cấp (18+), mặc định tắt
ALTER TABLE "users" ADD COLUMN "allowAdultContent" BOOLEAN NOT NULL DEFAULT false;
