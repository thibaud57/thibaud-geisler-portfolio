-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "displayOrder" SET DEFAULT 1;
ALTER TABLE "ProjectTag" ALTER COLUMN "displayOrder" SET DEFAULT 1;

-- Décale les données existantes : la règle métier "1..n sans trou" démarre à 1, pas à 0.
UPDATE "public"."Project" SET "displayOrder" = "displayOrder" + 1;
UPDATE "public"."ProjectTag" SET "displayOrder" = "displayOrder" + 1;
