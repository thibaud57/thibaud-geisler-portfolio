-- CreateEnum
CREATE TYPE "freelance"."ActionChannel" AS ENUM ('CANDIDATURE', 'CONNEXION_LINKEDIN', 'DM_LINKEDIN', 'EMAIL', 'SMS_WHATSAPP', 'CALL', 'AUTRE');

-- CreateEnum
CREATE TYPE "freelance"."ActionStatus" AS ENUM ('A_FAIRE', 'FAIT', 'REPONDU', 'CONVERTI', 'IGNORE');

-- CreateTable
CREATE TABLE "freelance"."ProspectingAction" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" "freelance"."ActionChannel" NOT NULL,
    "status" "freelance"."ActionStatus" NOT NULL DEFAULT 'A_FAIRE',
    "occurredAt" TIMESTAMPTZ NOT NULL,
    "message" TEXT,
    "respondedAt" TIMESTAMPTZ,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProspectingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProspectingAction_personId_occurredAt_idx" ON "freelance"."ProspectingAction"("personId", "occurredAt");

-- AddForeignKey
ALTER TABLE "freelance"."ProspectingAction" ADD CONSTRAINT "ProspectingAction_personId_fkey" FOREIGN KEY ("personId") REFERENCES "freelance"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
