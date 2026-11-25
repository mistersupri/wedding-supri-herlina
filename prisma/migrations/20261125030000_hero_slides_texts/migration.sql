-- A sequence of photos and videos for the opening screen, and the couple's own wording for template texts.
ALTER TABLE "Invitation"
  ADD COLUMN "heroSlides" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "texts" JSONB NOT NULL DEFAULT '{}';
