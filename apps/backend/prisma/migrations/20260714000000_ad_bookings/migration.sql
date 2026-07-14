-- AlterTable: ad_slots — giá niêm yết + cờ cho phép đặt public
ALTER TABLE "ad_slots" ADD COLUMN "pricePerDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isPublicForBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bookingNote" TEXT;

-- CreateEnum
CREATE TYPE "AdBookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ad_bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "pricePerDay" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "status" "AdBookingStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "companyName" TEXT,
    "note" TEXT,
    "adminNote" TEXT,
    "adId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_bookings_adId_key" ON "ad_bookings"("adId");
CREATE INDEX "ad_bookings_userId_idx" ON "ad_bookings"("userId");
CREATE INDEX "ad_bookings_slotId_status_idx" ON "ad_bookings"("slotId", "status");
CREATE INDEX "ad_bookings_status_idx" ON "ad_bookings"("status");
CREATE INDEX "ad_bookings_startDate_endDate_idx" ON "ad_bookings"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ad_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ad_bookings" ADD CONSTRAINT "ad_bookings_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
