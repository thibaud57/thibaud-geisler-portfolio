/*
  Warnings:

  - You are about to drop the column `locations` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `legalEntityId` on the `DataProcessing` table. All the data in the column will be lost.
  - You are about to drop the column `rcsNumber` on the `LegalEntity` table. All the data in the column will be lost.
  - You are about to drop the column `deliverablesCount` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `siren` on the `Publisher` table. All the data in the column will be lost.
  - Added the required column `processorLegalEntityId` to the `DataProcessing` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DataCategory" AS ENUM ('IDENTITY', 'CONTACT', 'IP_ADDRESS', 'USAGE_DATA', 'TECHNICAL_LOGS', 'COOKIE_DATA');

-- DropForeignKey
ALTER TABLE "DataProcessing" DROP CONSTRAINT "DataProcessing_legalEntityId_fkey";

-- DropIndex
DROP INDEX "Publisher_siren_key";

-- AlterTable
ALTER TABLE "ClientMeta" ADD COLUMN     "deliverablesCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "locations";

-- AlterTable
ALTER TABLE "DataProcessing" DROP COLUMN "legalEntityId",
ADD COLUMN     "dataCategories" "DataCategory"[],
ADD COLUMN     "processorLegalEntityId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LegalEntity" DROP COLUMN "rcsNumber";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "deliverablesCount";

-- AlterTable
ALTER TABLE "Publisher" DROP COLUMN "siren";

-- DropEnum
DROP TYPE "CompanyLocation";

-- AddForeignKey
ALTER TABLE "DataProcessing" ADD CONSTRAINT "DataProcessing_processorLegalEntityId_fkey" FOREIGN KEY ("processorLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
