-- CreateTable
CREATE TABLE "art_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "art_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_likes" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_likes_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "art_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_story_views" (
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "art_story_views_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateIndex
CREATE INDEX "art_posts_userId_idx" ON "art_posts"("userId");

-- CreateIndex
CREATE INDEX "art_posts_createdAt_idx" ON "art_posts"("createdAt");

-- CreateIndex
CREATE INDEX "art_likes_postId_idx" ON "art_likes"("postId");

-- CreateIndex
CREATE INDEX "art_comments_postId_createdAt_idx" ON "art_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "art_stories_userId_idx" ON "art_stories"("userId");

-- CreateIndex
CREATE INDEX "art_stories_expiresAt_idx" ON "art_stories"("expiresAt");

-- AddForeignKey
ALTER TABLE "art_posts" ADD CONSTRAINT "art_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_likes" ADD CONSTRAINT "art_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_likes" ADD CONSTRAINT "art_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "art_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_comments" ADD CONSTRAINT "art_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_comments" ADD CONSTRAINT "art_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "art_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_stories" ADD CONSTRAINT "art_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_story_views" ADD CONSTRAINT "art_story_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_story_views" ADD CONSTRAINT "art_story_views_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "art_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
