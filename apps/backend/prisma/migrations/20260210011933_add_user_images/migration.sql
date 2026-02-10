-- CreateTable
CREATE TABLE "user_images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_images_userId_folder_idx" ON "user_images"("userId", "folder");

-- CreateIndex
CREATE INDEX "user_images_userId_createdAt_idx" ON "user_images"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_images" ADD CONSTRAINT "user_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
