-- A collage (2 to 4 shots in one picture) uses that many frames of the guest's quota.
ALTER TABLE "PhotoMoment" ADD COLUMN "frames" INTEGER NOT NULL DEFAULT 1;
