-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deliverablesCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;
