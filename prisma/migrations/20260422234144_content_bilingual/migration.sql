-- Content bilingual : dupliquer title/description/caseStudyMarkdown (Project) + name (Tag)
-- en colonnes <champ>Fr / <champ>En avec backfill depuis la version FR existante.

-- 1. Project : ADD COLUMN nullable (pour permettre le backfill avant NOT NULL)
ALTER TABLE "Project"
  ADD COLUMN "titleFr" TEXT,
  ADD COLUMN "titleEn" TEXT,
  ADD COLUMN "descriptionFr" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "caseStudyMarkdownFr" TEXT,
  ADD COLUMN "caseStudyMarkdownEn" TEXT;

-- 2. Project : backfill FR depuis les anciennes colonnes
UPDATE "Project" SET
  "titleFr" = "title",
  "descriptionFr" = "description",
  "caseStudyMarkdownFr" = "caseStudyMarkdown";

-- 3. Project : backfill EN = FR (placeholder, sera écrasé par le seed ou édition manuelle)
UPDATE "Project" SET
  "titleEn" = "titleFr",
  "descriptionEn" = "descriptionFr",
  "caseStudyMarkdownEn" = "caseStudyMarkdownFr";

-- 4. Project : rétablir les contraintes NOT NULL
ALTER TABLE "Project"
  ALTER COLUMN "titleFr" SET NOT NULL,
  ALTER COLUMN "titleEn" SET NOT NULL,
  ALTER COLUMN "descriptionFr" SET NOT NULL,
  ALTER COLUMN "descriptionEn" SET NOT NULL;

-- 5. Project : DROP des anciennes colonnes
ALTER TABLE "Project"
  DROP COLUMN "title",
  DROP COLUMN "description",
  DROP COLUMN "caseStudyMarkdown";

-- 6. Tag : ADD COLUMN nullable
ALTER TABLE "Tag"
  ADD COLUMN "nameFr" TEXT,
  ADD COLUMN "nameEn" TEXT;

-- 7. Tag : backfill FR depuis l'ancienne colonne, EN = FR placeholder
UPDATE "Tag" SET "nameFr" = "name", "nameEn" = "name";

-- 8. Tag : NOT NULL + DROP de l'ancienne colonne
ALTER TABLE "Tag"
  ALTER COLUMN "nameFr" SET NOT NULL,
  ALTER COLUMN "nameEn" SET NOT NULL,
  DROP COLUMN "name";
