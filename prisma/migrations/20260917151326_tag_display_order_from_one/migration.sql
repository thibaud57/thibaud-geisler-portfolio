-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "displayOrder" SET DEFAULT 1;

-- Décale les données existantes : la règle métier "1..n sans trou" démarre à 1, pas à 0.
UPDATE "public"."Tag" SET "displayOrder" = "displayOrder" + 1;
