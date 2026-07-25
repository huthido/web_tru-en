-- AlterTable: users — slug tuỳ chỉnh cho URL chia sẻ /u/[slug] (nullable, unique)
ALTER TABLE "users" ADD COLUMN "profileSlug" TEXT;

-- CreateIndex: unique để không hai người trùng slug
CREATE UNIQUE INDEX "users_profileSlug_key" ON "users"("profileSlug");
