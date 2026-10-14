-- CreateEnum
CREATE TYPE "freelance"."InterviewSide" AS ENUM ('ESN', 'CLIENT_FINAL');

-- CreateEnum
CREATE TYPE "freelance"."InterviewType" AS ENUM ('PREMIER_CONTACT', 'RECRUTEUR_RH', 'TECHNIQUE', 'MANAGER_EQUIPE', 'NEGOCIATION');

-- CreateEnum
CREATE TYPE "freelance"."InterviewStatus" AS ENUM ('PLANIFIE', 'FAIT', 'ANNULE');

-- CreateEnum
CREATE TYPE "freelance"."InterviewOutcome" AS ENUM ('POSITIF', 'NEGATIF', 'SANS_SUITE');

-- CreateEnum
CREATE TYPE "freelance"."InterviewDecision" AS ENUM ('OUI_TRES_INTERESSE', 'OUI_SOUS_CONDITIONS', 'NON');

-- CreateTable
CREATE TABLE "freelance"."Interview" (
    "id" TEXT NOT NULL,
    "side" "freelance"."InterviewSide" NOT NULL,
    "type" "freelance"."InterviewType" NOT NULL,
    "status" "freelance"."InterviewStatus" NOT NULL DEFAULT 'PLANIFIE',
    "outcome" "freelance"."InterviewOutcome",
    "scheduledAt" TIMESTAMPTZ NOT NULL,
    "score" INTEGER,
    "decision" "freelance"."InterviewDecision",
    "notes" TEXT,
    "details" TEXT,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance"."_InterviewCorrespondents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InterviewCorrespondents_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Interview_opportunityId_scheduledAt_idx" ON "freelance"."Interview"("opportunityId", "scheduledAt");

-- CreateIndex
CREATE INDEX "_InterviewCorrespondents_B_index" ON "freelance"."_InterviewCorrespondents"("B");

-- AddForeignKey
ALTER TABLE "freelance"."Interview" ADD CONSTRAINT "Interview_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "freelance"."Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance"."_InterviewCorrespondents" ADD CONSTRAINT "_InterviewCorrespondents_A_fkey" FOREIGN KEY ("A") REFERENCES "freelance"."Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance"."_InterviewCorrespondents" ADD CONSTRAINT "_InterviewCorrespondents_B_fkey" FOREIGN KEY ("B") REFERENCES "freelance"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
