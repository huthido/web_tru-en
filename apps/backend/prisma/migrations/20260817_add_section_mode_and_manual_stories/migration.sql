-- AlterTable: Add mode column to homepage_sections
ALTER TABLE "homepage_sections" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'auto';

-- CreateTable
CREATE TABLE "homepage_section_stories" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_section_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homepage_section_stories_sectionId_storyId_key" ON "homepage_section_stories"("sectionId", "storyId");

-- CreateIndex
CREATE INDEX "homepage_section_stories_sectionId_idx" ON "homepage_section_stories"("sectionId");

-- CreateIndex
CREATE INDEX "homepage_section_stories_storyId_idx" ON "homepage_section_stories"("storyId");

-- AddForeignKey
ALTER TABLE "homepage_section_stories" ADD CONSTRAINT "homepage_section_stories_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "homepage_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_section_stories" ADD CONSTRAINT "homepage_section_stories_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
