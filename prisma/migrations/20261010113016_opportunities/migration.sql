-- CreateEnum
CREATE TYPE "freelance"."OpportunityStatus" AS ENUM ('PROPOSEE', 'EN_PROCESS', 'OFFRE_RECUE', 'EN_PAUSE', 'ACCEPTEE', 'REFUSEE', 'DECLINEE', 'ABANDONNEE');

-- CreateTable
CREATE TABLE "freelance"."Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT,
    "status" "freelance"."OpportunityStatus" NOT NULL DEFAULT 'PROPOSEE',
    "dailyRate" INTEGER,
    "contract" "ContractStatus",
    "workMode" "WorkMode",
    "daysPerWeek" INTEGER,
    "onSiteDays" INTEGER,
    "zone" "freelance"."Zone",
    "startMonth" DATE,
    "durationMonths" INTEGER,
    "notes" TEXT,
    "details" TEXT,
    "referrerId" TEXT,
    "intermediaryId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Opportunity_referrerId_idx" ON "freelance"."Opportunity"("referrerId");

-- CreateIndex
CREATE INDEX "Opportunity_intermediaryId_idx" ON "freelance"."Opportunity"("intermediaryId");

-- CreateIndex
CREATE INDEX "Opportunity_clientId_idx" ON "freelance"."Opportunity"("clientId");

-- AddForeignKey
ALTER TABLE "freelance"."Opportunity" ADD CONSTRAINT "Opportunity_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "freelance"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance"."Opportunity" ADD CONSTRAINT "Opportunity_intermediaryId_fkey" FOREIGN KEY ("intermediaryId") REFERENCES "freelance"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance"."Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "freelance"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma ne sait pas écrire cette contrainte : un intermédiaire ne peut pas être aussi le client final.
ALTER TABLE "freelance"."Opportunity" ADD CONSTRAINT "Opportunity_intermediary_client_check" CHECK ("intermediaryId" <> "clientId");
