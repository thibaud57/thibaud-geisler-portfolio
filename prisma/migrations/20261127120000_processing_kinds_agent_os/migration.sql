-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProcessingKind" ADD VALUE 'MESSAGING';
ALTER TYPE "ProcessingKind" ADD VALUE 'WEB_SEARCH';
ALTER TYPE "ProcessingKind" ADD VALUE 'AI_SCREENING';
