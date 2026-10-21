-- CreateEnum
CREATE TYPE "MomentAccess" AS ENUM ('CHECKED_IN', 'INVITED', 'ANYONE');

-- CreateEnum
CREATE TYPE "MomentVisibility" AS ENUM ('ALL', 'OWN');

-- CreateEnum
CREATE TYPE "MomentDownload" AS ENUM ('NONE', 'OWN', 'ALL');

-- AlterTable
ALTER TABLE "PhotoMoment" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "commentsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "look" TEXT,
ADD COLUMN     "originalUrl" TEXT;

-- CreateTable
CREATE TABLE "PhotoComment" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestSlug" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraSetting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "access" "MomentAccess" NOT NULL DEFAULT 'CHECKED_IN',
    "framesPerGuest" INTEGER NOT NULL DEFAULT 15,
    "cameraOpen" BOOLEAN NOT NULL DEFAULT true,
    "moderation" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "MomentVisibility" NOT NULL DEFAULT 'ALL',
    "download" "MomentDownload" NOT NULL DEFAULT 'OWN',
    "enabledLooks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultLook" TEXT NOT NULL DEFAULT 'none',
    "screenEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CameraSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoComment_momentId_createdAt_idx" ON "PhotoComment"("momentId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoMoment_approved_createdAt_idx" ON "PhotoMoment"("approved", "createdAt");

-- AddForeignKey
ALTER TABLE "PhotoComment" ADD CONSTRAINT "PhotoComment_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "PhotoMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

