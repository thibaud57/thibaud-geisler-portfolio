-- CreateEnum
CREATE TYPE "public"."LegalForm" AS ENUM ('ENTREPRENEUR_INDIVIDUEL', 'EURL', 'SARL', 'SAS', 'SASU', 'SA', 'SNC', 'SCI', 'ASSOCIATION', 'SARL_LU', 'SARL_S_LU', 'SA_LU', 'INCORPORATED_US');

ALTER TABLE "public"."LegalEntity" DROP CONSTRAINT "LegalEntity_addressId_fkey";

ALTER TABLE "public"."LegalEntity" ADD COLUMN     "legalForm" "public"."LegalForm",
ADD COLUMN     "rcsNumber" TEXT,
ALTER COLUMN "addressId" DROP NOT NULL;

ALTER TABLE "public"."LegalEntity" ADD CONSTRAINT "LegalEntity_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Deux clients luxembourgeois de l'ancien seed, rangés dans des formes françaises.
UPDATE "public"."LegalEntity" SET "legalForm" = 'SARL_LU' WHERE "slug" = 'cloudsmart-sarl';
UPDATE "public"."LegalEntity" SET "legalForm" = 'SA_LU' WHERE "slug" = 'foyer-group-sa';

UPDATE "public"."LegalEntity" SET "legalForm" = 'ENTREPRENEUR_INDIVIDUEL' WHERE "legalStatusKey" = 'entrepreneurIndividuel' AND "legalForm" IS NULL;
UPDATE "public"."LegalEntity" SET "legalForm" = 'SARL' WHERE "legalStatusKey" = 'sarl' AND "legalForm" IS NULL;
UPDATE "public"."LegalEntity" SET "legalForm" = 'INCORPORATED_US' WHERE "legalStatusKey" = 'incorporated' AND "legalForm" IS NULL;

ALTER TABLE "public"."LegalEntity" DROP COLUMN "legalStatusKey";

-- Franchise et assujetti n'existent plus comme valeurs : la colonne repart à zéro, l'admin ressaisit.
ALTER TABLE "public"."Publisher" ALTER COLUMN "vatRegime" DROP NOT NULL;
UPDATE "public"."Publisher" SET "vatRegime" = NULL;

ALTER TYPE "public"."VatRegime" RENAME TO "VatRegime_old";
CREATE TYPE "public"."VatRegime" AS ENUM ('REEL_SIMPLIFIE', 'REEL_NORMAL');
ALTER TABLE "public"."Publisher" ALTER COLUMN "vatRegime" TYPE "public"."VatRegime" USING NULL::"public"."VatRegime";
DROP TYPE "public"."VatRegime_old";

ALTER TABLE "public"."Publisher" ADD COLUMN "vatLiableSince" DATE;
