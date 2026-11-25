-- "Guests must be checked in" becomes its own switch, off by default, next to who may use the camera.
-- The old CHECKED_IN access mode meant "invited guests who are checked in": carry it over as INVITED + the switch on.
ALTER TABLE "CameraSetting" ADD COLUMN "requireCheckIn" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CameraSetting" SET "requireCheckIn" = true, "access" = 'INVITED' WHERE "access" = 'CHECKED_IN';

ALTER TABLE "CameraSetting" ALTER COLUMN "access" SET DEFAULT 'INVITED';
