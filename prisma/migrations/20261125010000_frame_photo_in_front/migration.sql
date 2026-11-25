-- The couple can put the guest's photo in front of the frame (for solid, non-transparent frames).
ALTER TABLE "PhotoFrameSetting"
  ADD COLUMN "photoInFront" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "photoInsetTop" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "photoInsetRight" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "photoInsetBottom" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "photoInsetLeft" INTEGER NOT NULL DEFAULT 8;
