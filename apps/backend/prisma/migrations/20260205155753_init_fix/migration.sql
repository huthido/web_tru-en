-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'AUTHOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('STORY_PUBLISH', 'CHAPTER_PUBLISH');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM_UPDATE', 'MAINTENANCE', 'NEW_FEATURE', 'ANNOUNCEMENT', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('POPUP', 'BANNER', 'SIDEBAR');

-- CreateEnum
CREATE TYPE "AdPosition" AS ENUM ('TOP', 'BOTTOM', 'SIDEBAR_LEFT', 'SIDEBAR_RIGHT', 'INLINE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "avatar" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT,
    "provider" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "followCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastChapterAt" TIMESTAMP(3),

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[],
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "readingTime" INTEGER NOT NULL DEFAULT 0,
    "uploaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "chapterId" TEXT,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "lastRead" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_logs" (
    "id" TEXT NOT NULL,
    "storyId" TEXT,
    "chapterId" TEXT,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_categories" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_tags" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "position" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "storyId" TEXT,
    "chapterId" TEXT,
    "reportType" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "chapterId" TEXT,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget" DOUBLE PRECISION,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "type" "AdType" NOT NULL DEFAULT 'BANNER',
    "position" "AdPosition" NOT NULL DEFAULT 'BOTTOM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "popupInterval" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "campaignId" TEXT,
    "targetAudience" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_clicks" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'Web Truyện HungYeu',
    "siteDescription" TEXT,
    "siteLogo" TEXT,
    "siteFavicon" TEXT,
    "siteEmail" TEXT,
    "sitePhone" TEXT,
    "siteAddress" TEXT,
    "siteFacebook" TEXT,
    "siteTwitter" TEXT,
    "siteX" TEXT,
    "siteYoutube" TEXT,
    "siteInstagram" TEXT,
    "siteTikTok" TEXT,
    "siteLinkedIn" TEXT,
    "siteThreads" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "targetRole" "UserRole",
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_provider_providerId_idx" ON "users"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_slug_idx" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_authorId_idx" ON "stories"("authorId");

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE INDEX "stories_isPublished_idx" ON "stories"("isPublished");

-- CreateIndex
CREATE INDEX "stories_createdAt_idx" ON "stories"("createdAt");

-- CreateIndex
CREATE INDEX "stories_updatedAt_idx" ON "stories"("updatedAt");

-- CreateIndex
CREATE INDEX "stories_lastChapterAt_idx" ON "stories"("lastChapterAt");

-- CreateIndex
CREATE INDEX "stories_country_idx" ON "stories"("country");

-- CreateIndex
CREATE INDEX "stories_rating_idx" ON "stories"("rating");

-- CreateIndex
CREATE INDEX "stories_viewCount_idx" ON "stories"("viewCount");

-- CreateIndex
CREATE INDEX "stories_followCount_idx" ON "stories"("followCount");

-- CreateIndex
CREATE INDEX "stories_isPublished_status_createdAt_idx" ON "stories"("isPublished", "status", "createdAt");

-- CreateIndex
CREATE INDEX "stories_isPublished_rating_ratingCount_idx" ON "stories"("isPublished", "rating", "ratingCount");

-- CreateIndex
CREATE INDEX "stories_isPublished_likeCount_followCount_idx" ON "stories"("isPublished", "likeCount", "followCount");

-- CreateIndex
CREATE INDEX "stories_isRecommended_isPublished_createdAt_idx" ON "stories"("isRecommended", "isPublished", "createdAt");

-- CreateIndex
CREATE INDEX "chapters_storyId_idx" ON "chapters"("storyId");

-- CreateIndex
CREATE INDEX "chapters_storyId_order_idx" ON "chapters"("storyId", "order");

-- CreateIndex
CREATE INDEX "chapters_slug_idx" ON "chapters"("slug");

-- CreateIndex
CREATE INDEX "chapters_isPublished_idx" ON "chapters"("isPublished");

-- CreateIndex
CREATE INDEX "chapters_createdAt_idx" ON "chapters"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_storyId_slug_key" ON "chapters"("storyId", "slug");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "comments_storyId_idx" ON "comments"("storyId");

-- CreateIndex
CREATE INDEX "comments_chapterId_idx" ON "comments"("chapterId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "comments_isDeleted_idx" ON "comments"("isDeleted");

-- CreateIndex
CREATE INDEX "comments_storyId_isDeleted_createdAt_idx" ON "comments"("storyId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "comments_chapterId_isDeleted_createdAt_idx" ON "comments"("chapterId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "comments_parentId_createdAt_idx" ON "comments"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "follows_userId_idx" ON "follows"("userId");

-- CreateIndex
CREATE INDEX "follows_storyId_idx" ON "follows"("storyId");

-- CreateIndex
CREATE INDEX "follows_createdAt_idx" ON "follows"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "follows_userId_storyId_key" ON "follows"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "reading_history_userId_idx" ON "reading_history"("userId");

-- CreateIndex
CREATE INDEX "reading_history_userId_lastRead_idx" ON "reading_history"("userId", "lastRead");

-- CreateIndex
CREATE INDEX "reading_history_storyId_idx" ON "reading_history"("storyId");

-- CreateIndex
CREATE INDEX "reading_history_chapterId_idx" ON "reading_history"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_history_userId_storyId_key" ON "reading_history"("userId", "storyId");

-- CreateIndex
CREATE INDEX "view_logs_storyId_idx" ON "view_logs"("storyId");

-- CreateIndex
CREATE INDEX "view_logs_chapterId_idx" ON "view_logs"("chapterId");

-- CreateIndex
CREATE INDEX "view_logs_userId_idx" ON "view_logs"("userId");

-- CreateIndex
CREATE INDEX "view_logs_createdAt_idx" ON "view_logs"("createdAt");

-- CreateIndex
CREATE INDEX "view_logs_ipAddress_idx" ON "view_logs"("ipAddress");

-- CreateIndex
CREATE INDEX "story_categories_storyId_idx" ON "story_categories"("storyId");

-- CreateIndex
CREATE INDEX "story_categories_categoryId_idx" ON "story_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "story_categories_storyId_categoryId_key" ON "story_categories"("storyId", "categoryId");

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- CreateIndex
CREATE INDEX "favorites_storyId_idx" ON "favorites"("storyId");

-- CreateIndex
CREATE INDEX "favorites_createdAt_idx" ON "favorites"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_storyId_key" ON "favorites"("userId", "storyId");

-- CreateIndex
CREATE INDEX "ratings_userId_idx" ON "ratings"("userId");

-- CreateIndex
CREATE INDEX "ratings_storyId_idx" ON "ratings"("storyId");

-- CreateIndex
CREATE INDEX "ratings_rating_idx" ON "ratings"("rating");

-- CreateIndex
CREATE INDEX "ratings_createdAt_idx" ON "ratings"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_userId_storyId_key" ON "ratings"("userId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "story_tags_storyId_idx" ON "story_tags"("storyId");

-- CreateIndex
CREATE INDEX "story_tags_tagId_idx" ON "story_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "story_tags_storyId_tagId_key" ON "story_tags"("storyId", "tagId");

-- CreateIndex
CREATE INDEX "banners_isActive_idx" ON "banners"("isActive");

-- CreateIndex
CREATE INDEX "banners_position_idx" ON "banners"("position");

-- CreateIndex
CREATE INDEX "banners_order_idx" ON "banners"("order");

-- CreateIndex
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");

-- CreateIndex
CREATE INDEX "content_reports_storyId_idx" ON "content_reports"("storyId");

-- CreateIndex
CREATE INDEX "content_reports_chapterId_idx" ON "content_reports"("chapterId");

-- CreateIndex
CREATE INDEX "content_reports_createdAt_idx" ON "content_reports"("createdAt");

-- CreateIndex
CREATE INDEX "approval_requests_userId_idx" ON "approval_requests"("userId");

-- CreateIndex
CREATE INDEX "approval_requests_storyId_idx" ON "approval_requests"("storyId");

-- CreateIndex
CREATE INDEX "approval_requests_chapterId_idx" ON "approval_requests"("chapterId");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_type_idx" ON "approval_requests"("type");

-- CreateIndex
CREATE INDEX "approval_requests_createdAt_idx" ON "approval_requests"("createdAt");

-- CreateIndex
CREATE INDEX "campaigns_isActive_idx" ON "campaigns"("isActive");

-- CreateIndex
CREATE INDEX "campaigns_startDate_idx" ON "campaigns"("startDate");

-- CreateIndex
CREATE INDEX "campaigns_endDate_idx" ON "campaigns"("endDate");

-- CreateIndex
CREATE INDEX "campaigns_createdById_idx" ON "campaigns"("createdById");

-- CreateIndex
CREATE INDEX "ads_type_idx" ON "ads"("type");

-- CreateIndex
CREATE INDEX "ads_position_idx" ON "ads"("position");

-- CreateIndex
CREATE INDEX "ads_isActive_idx" ON "ads"("isActive");

-- CreateIndex
CREATE INDEX "ads_startDate_idx" ON "ads"("startDate");

-- CreateIndex
CREATE INDEX "ads_endDate_idx" ON "ads"("endDate");

-- CreateIndex
CREATE INDEX "ads_priority_idx" ON "ads"("priority");

-- CreateIndex
CREATE INDEX "ads_campaignId_idx" ON "ads"("campaignId");

-- CreateIndex
CREATE INDEX "ads_createdById_idx" ON "ads"("createdById");

-- CreateIndex
CREATE INDEX "ad_impressions_adId_idx" ON "ad_impressions"("adId");

-- CreateIndex
CREATE INDEX "ad_impressions_userId_idx" ON "ad_impressions"("userId");

-- CreateIndex
CREATE INDEX "ad_impressions_createdAt_idx" ON "ad_impressions"("createdAt");

-- CreateIndex
CREATE INDEX "ad_impressions_ipAddress_idx" ON "ad_impressions"("ipAddress");

-- CreateIndex
CREATE INDEX "ad_impressions_device_idx" ON "ad_impressions"("device");

-- CreateIndex
CREATE INDEX "ad_clicks_adId_idx" ON "ad_clicks"("adId");

-- CreateIndex
CREATE INDEX "ad_clicks_userId_idx" ON "ad_clicks"("userId");

-- CreateIndex
CREATE INDEX "ad_clicks_createdAt_idx" ON "ad_clicks"("createdAt");

-- CreateIndex
CREATE INDEX "ad_clicks_ipAddress_idx" ON "ad_clicks"("ipAddress");

-- CreateIndex
CREATE INDEX "ad_clicks_device_idx" ON "ad_clicks"("device");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_isActive_idx" ON "pages"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_codes_code_key" ON "oauth_codes"("code");

-- CreateIndex
CREATE INDEX "oauth_codes_code_idx" ON "oauth_codes"("code");

-- CreateIndex
CREATE INDEX "oauth_codes_userId_idx" ON "oauth_codes"("userId");

-- CreateIndex
CREATE INDEX "oauth_codes_expiresAt_idx" ON "oauth_codes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expiresAt_idx" ON "email_verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "login_attempts_identifier_createdAt_idx" ON "login_attempts"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_createdAt_idx" ON "login_attempts"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_createdAt_idx" ON "login_attempts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_targetRole_idx" ON "notifications"("targetRole");

-- CreateIndex
CREATE INDEX "notifications_isActive_idx" ON "notifications"("isActive");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_recipients_userId_isRead_idx" ON "notification_recipients"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notification_recipients_notificationId_idx" ON "notification_recipients"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_userId_key" ON "notification_recipients"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_logs" ADD CONSTRAINT "view_logs_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_logs" ADD CONSTRAINT "view_logs_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_logs" ADD CONSTRAINT "view_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_categories" ADD CONSTRAINT "story_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_categories" ADD CONSTRAINT "story_categories_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_codes" ADD CONSTRAINT "oauth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
