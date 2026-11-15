-- A wish now belongs to the invitation code of the guest who sent it (one wish per code, not per typed name).
ALTER TABLE "GuestWish" ADD COLUMN "guestSlug" TEXT;

-- Existing wishes: attach them to the invited guest with the same name, when there is exactly one such guest.
UPDATE "GuestWish" AS w
SET "guestSlug" = g."slug",
    "guestKey" = 'code:' || g."slug"
FROM "InvitedGuest" AS g
WHERE lower(trim(g."name")) = w."guestKey"
  AND (SELECT count(*) FROM "InvitedGuest" AS g2 WHERE lower(trim(g2."name")) = w."guestKey") = 1;

CREATE INDEX "GuestWish_guestSlug_idx" ON "GuestWish"("guestSlug");
