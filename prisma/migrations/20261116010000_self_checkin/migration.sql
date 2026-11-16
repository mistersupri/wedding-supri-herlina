-- Guests can confirm their own attendance, optionally only while they are at the venue.
ALTER TYPE "CheckInMethod" ADD VALUE 'SELF';

CREATE TABLE "AttendanceSetting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "selfCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "verifyLocation" BOOLEAN NOT NULL DEFAULT true,
    "venueLat" DOUBLE PRECISION,
    "venueLng" DOUBLE PRECISION,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,

    CONSTRAINT "AttendanceSetting_pkey" PRIMARY KEY ("id")
);
