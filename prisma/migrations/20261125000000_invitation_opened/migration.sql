-- Tracks whether (and when) each guest opened their personal invitation.
ALTER TABLE "InvitedGuest"
  ADD COLUMN "firstOpenedAt" TIMESTAMP(3),
  ADD COLUMN "lastOpenedAt" TIMESTAMP(3),
  ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0;
