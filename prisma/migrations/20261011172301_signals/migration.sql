-- CreateEnum
CREATE TYPE "freelance"."SignalType" AS ENUM ('OFFRE_POSTE', 'LEVEE', 'EXPANSION', 'NOUVEAU_PRODUIT', 'PIVOT', 'ACQUISITION', 'POST', 'COMMENTAIRE', 'CONFERENCE', 'INTERACTION');

-- CreateTable
CREATE TABLE "freelance"."Signal" (
    "id" TEXT NOT NULL,
    "type" "freelance"."SignalType" NOT NULL,
    "occurredOn" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "companyId" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_companyId_idx" ON "freelance"."Signal"("companyId");

-- CreateIndex
CREATE INDEX "Signal_personId_idx" ON "freelance"."Signal"("personId");

-- AddForeignKey
ALTER TABLE "freelance"."Signal" ADD CONSTRAINT "Signal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "freelance"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance"."Signal" ADD CONSTRAINT "Signal_personId_fkey" FOREIGN KEY ("personId") REFERENCES "freelance"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Contraintes que Prisma ne sait pas écrire : un seul rattachement, puis un type propre à ce rattachement
ALTER TABLE "freelance"."Signal" ADD CONSTRAINT "Signal_owner_check" CHECK (("companyId" IS NULL) <> ("personId" IS NULL));
ALTER TABLE "freelance"."Signal" ADD CONSTRAINT "Signal_type_check" CHECK (
  ("companyId" IS NOT NULL AND "type" IN ('OFFRE_POSTE', 'LEVEE', 'EXPANSION', 'NOUVEAU_PRODUIT', 'PIVOT', 'ACQUISITION'))
  OR ("personId" IS NOT NULL AND "type" IN ('POST', 'COMMENTAIRE', 'CONFERENCE', 'INTERACTION'))
);
