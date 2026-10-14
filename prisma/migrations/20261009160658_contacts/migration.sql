-- CreateEnum
CREATE TYPE "freelance"."ContactType" AS ENUM ('COLLEGUE', 'CLIENT', 'PARTENAIRE', 'MENTOR', 'CONTACT_TECH', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "freelance"."ContactStatus" AS ENUM ('ACTIF', 'INACTIF', 'A_RECONTACTER');

-- CreateTable
CREATE TABLE "freelance"."Contact" (
    "personId" TEXT NOT NULL,
    "types" "freelance"."ContactType"[] DEFAULT ARRAY[]::"freelance"."ContactType"[],
    "status" "freelance"."ContactStatus" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("personId")
);

-- AddForeignKey
ALTER TABLE "freelance"."Contact" ADD CONSTRAINT "Contact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "freelance"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
