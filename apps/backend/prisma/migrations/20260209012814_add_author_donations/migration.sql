-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'DONATE_AUTHOR';

-- CreateTable
CREATE TABLE "author_donations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "storyId" TEXT,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "author_donations_userId_idx" ON "author_donations"("userId");

-- CreateIndex
CREATE INDEX "author_donations_authorId_idx" ON "author_donations"("authorId");

-- CreateIndex
CREATE INDEX "author_donations_storyId_idx" ON "author_donations"("storyId");

-- CreateIndex
CREATE INDEX "author_donations_createdAt_idx" ON "author_donations"("createdAt");

-- AddForeignKey
ALTER TABLE "author_donations" ADD CONSTRAINT "author_donations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_donations" ADD CONSTRAINT "author_donations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
