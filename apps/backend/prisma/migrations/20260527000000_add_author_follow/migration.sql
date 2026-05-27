-- CreateTable
CREATE TABLE "author_follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "author_follows_authorId_idx" ON "author_follows"("authorId");

-- CreateIndex
CREATE INDEX "author_follows_userId_idx" ON "author_follows"("userId");

-- CreateIndex
CREATE INDEX "author_follows_createdAt_idx" ON "author_follows"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "author_follows_userId_authorId_key" ON "author_follows"("userId", "authorId");

-- AddForeignKey
ALTER TABLE "author_follows" ADD CONSTRAINT "author_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_follows" ADD CONSTRAINT "author_follows_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
