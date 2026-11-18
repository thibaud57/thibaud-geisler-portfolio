-- Dormante se déduit désormais de la dernière interaction : les entreprises saisies Dormante repassent Active.
UPDATE "freelance"."Company" SET "relationStatus" = 'ACTIVE' WHERE "relationStatus" = 'DORMANTE';

-- AlterEnum
BEGIN;
CREATE TYPE "freelance"."RelationStatus_new" AS ENUM ('ACTIVE', 'ARCHIVEE');
ALTER TABLE "freelance"."Company" ALTER COLUMN "relationStatus" DROP DEFAULT;
ALTER TABLE "freelance"."Company" ALTER COLUMN "relationStatus" TYPE "freelance"."RelationStatus_new" USING ("relationStatus"::text::"freelance"."RelationStatus_new");
ALTER TYPE "freelance"."RelationStatus" RENAME TO "RelationStatus_old";
ALTER TYPE "freelance"."RelationStatus_new" RENAME TO "RelationStatus";
DROP TYPE "freelance"."RelationStatus_old";
ALTER TABLE "freelance"."Company" ALTER COLUMN "relationStatus" SET DEFAULT 'ACTIVE';
COMMIT;

