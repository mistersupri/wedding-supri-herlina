-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('HADIR', 'TIDAK_HADIR', 'RAGU');

-- CreateEnum
CREATE TYPE "GalleryCategory" AS ENUM ('PREWEDDING', 'ENGAGEMENT', 'MOMENTS', 'CEREMONY');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR_SCAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPERADMIN', 'ADMIN');

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "groomName" TEXT NOT NULL,
    "groomShortName" TEXT NOT NULL,
    "groomParents" TEXT NOT NULL,
    "groomInstagram" TEXT,
    "groomPhoto" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "brideShortName" TEXT NOT NULL,
    "brideParents" TEXT NOT NULL,
    "brideInstagram" TEXT,
    "bridePhoto" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL,
    "heroVideoUrl" TEXT,
    "heroMediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "quoteText" TEXT NOT NULL,
    "quoteSource" TEXT NOT NULL,
    "weddingDate" TIMESTAMP(3) NOT NULL,
    "countdownTarget" TIMESTAMP(3) NOT NULL,
    "musicUrl" TEXT NOT NULL,
    "musicTitle" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "whatsappTemplate" TEXT NOT NULL,
    "templateId" TEXT NOT NULL DEFAULT 'nusantara',
    "themeColor" TEXT NOT NULL DEFAULT 'sogan',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapsUrl" TEXT NOT NULL,
    "mapsEmbedUrl" TEXT,
    "dressCode" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoveStory" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoveStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "isQris" BOOLEAN NOT NULL DEFAULT false,
    "qrisImageUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GiftAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" "GalleryCategory" NOT NULL DEFAULT 'MOMENTS',
    "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "thumbnailUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestWish" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestKey" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL,
    "numberOfGuests" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT NOT NULL,
    "voiceUrl" TEXT,
    "reply" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitedGuest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Umum',
    "pax" INTEGER NOT NULL DEFAULT 2,
    "tableNumber" TEXT NOT NULL DEFAULT '',
    "customNote" TEXT NOT NULL DEFAULT '',
    "invitationSent" BOOLEAN NOT NULL DEFAULT false,
    "invitationSentAt" TIMESTAMP(3),
    "isCheckedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TIMESTAMP(3),
    "checkInMethod" "CheckInMethod",
    "actualPax" INTEGER,
    "souvenirGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitedGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoMoment" (
    "id" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestSlug" TEXT,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "reactions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoFrameSetting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frameOverlayUrl" TEXT NOT NULL,
    "frameName" TEXT,
    "allowGuestToggle" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PhotoFrameSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestWish_guestKey_key" ON "GuestWish"("guestKey");

-- CreateIndex
CREATE INDEX "GuestWish_createdAt_idx" ON "GuestWish"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvitedGuest_slug_key" ON "InvitedGuest"("slug");

-- CreateIndex
CREATE INDEX "PhotoMoment_guestSlug_idx" ON "PhotoMoment"("guestSlug");

-- CreateIndex
CREATE INDEX "PhotoMoment_createdAt_idx" ON "PhotoMoment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

