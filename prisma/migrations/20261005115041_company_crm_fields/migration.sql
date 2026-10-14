-- EMARKETING est renommé, pas recréé : la ligne qui le porte le garde sous son nouveau nom.
ALTER TYPE "freelance"."CompanySector" RENAME VALUE 'EMARKETING' TO 'MARKETING_COMMUNICATION';
ALTER TYPE "freelance"."CompanySector" ADD VALUE 'INDUSTRIE' BEFORE 'AUTRE';
ALTER TYPE "freelance"."CompanySector" ADD VALUE 'HEALTHTECH' BEFORE 'AUTRE';
ALTER TYPE "freelance"."CompanySector" ADD VALUE 'SECTEUR_PUBLIC' BEFORE 'AUTRE';

-- CreateEnum
CREATE TYPE "freelance"."CompanyType" AS ENUM ('CLIENT_FINAL', 'ESN_RECRUTEMENT', 'PARTENAIRE', 'MA_SOCIETE');

-- CreateEnum
CREATE TYPE "freelance"."RelationStatus" AS ENUM ('ACTIVE', 'DORMANTE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "freelance"."Zone" AS ENUM ('GRAND_EST', 'PARIS', 'FRANCE', 'LUXEMBOURG', 'BELGIQUE', 'SUISSE', 'ALLEMAGNE', 'EUROPE', 'MONDE');

-- AlterTable
ALTER TABLE "freelance"."Company" ADD COLUMN     "details" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "relationStatus" "freelance"."RelationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "types" "freelance"."CompanyType"[] DEFAULT ARRAY[]::"freelance"."CompanyType"[],
ADD COLUMN     "zones" "freelance"."Zone"[] DEFAULT ARRAY[]::"freelance"."Zone"[];

-- Rattrapage : les entreprises déjà citées par un projet client entrent typées Client final.
UPDATE "freelance"."Company" AS c
SET "types" = ARRAY['CLIENT_FINAL']::"freelance"."CompanyType"[]
WHERE EXISTS (
  SELECT 1
  FROM "public"."ClientMeta" AS cm
  JOIN "public"."Project" AS p ON p."id" = cm."projectId"
  WHERE cm."companyId" = c."id" AND p."type" = 'CLIENT'
);

UPDATE "freelance"."Company"
SET "types" = ARRAY['MA_SOCIETE']::"freelance"."CompanyType"[]
WHERE "slug" = 'thibaud-geisler';
