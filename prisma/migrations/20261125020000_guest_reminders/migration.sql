-- Reminders sent to a guest over WhatsApp (to avoid nagging the same person twice in a row).
ALTER TABLE "InvitedGuest"
  ADD COLUMN "lastRemindedAt" TIMESTAMP(3),
  ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
