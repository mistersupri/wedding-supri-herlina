-- Size/position control for the photo on the event frame, plus border and the gap between collage photos.
ALTER TABLE "PhotoFrameSetting"
  ADD COLUMN "photoManualArea" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "photoBorder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "photoBorderColor" TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN "photoGap" INTEGER NOT NULL DEFAULT 38;
