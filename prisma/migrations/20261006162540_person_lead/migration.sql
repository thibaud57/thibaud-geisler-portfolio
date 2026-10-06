-- CreateEnum
CREATE TYPE "freelance"."LeadOrigin" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "freelance"."LeadStatus" AS ENUM ('NOUVEAU', 'SUSPECT', 'DISCUSSION', 'HORS_ICP', 'PERDU', 'STAND_BY');

-- CreateEnum
CREATE TYPE "freelance"."LeadInterest" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "freelance"."LeadChannel" AS ENUM ('LINKEDIN', 'SITE_WEB', 'CANDIDATURE', 'PLATEFORME', 'REFERENCE', 'EVENEMENT', 'COLD_EMAIL', 'COLD_CALL', 'AUTRE');

-- CreateEnum
CREATE TYPE "freelance"."JobRole" AS ENUM ('CTO', 'TECH_LEAD', 'RECRUTEUR', 'DEVELOPPEUR', 'CEO', 'PRODUCT_OWNER', 'C_LEVEL', 'MANAGER', 'AUTRE');

-- CreateTable
CREATE TABLE "freelance"."Person" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "jobRole" "freelance"."JobRole",
    "zone" "freelance"."Zone",
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "metAt" DATE,
    "notes" TEXT,
    "details" TEXT,
    "optedOutAt" TIMESTAMPTZ,
    "exchangesErasedAt" TIMESTAMPTZ,
    "companyId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelance"."Lead" (
    "personId" TEXT NOT NULL,
    "origin" "freelance"."LeadOrigin" NOT NULL,
    "status" "freelance"."LeadStatus" NOT NULL DEFAULT 'NOUVEAU',
    "interest" "freelance"."LeadInterest",
    "channel" "freelance"."LeadChannel",
    "score" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("personId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "freelance"."Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_linkedinUrl_key" ON "freelance"."Person"("linkedinUrl");

-- CreateIndex
CREATE INDEX "Person_companyId_idx" ON "freelance"."Person"("companyId");

-- AddForeignKey
ALTER TABLE "freelance"."Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "freelance"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelance"."Lead" ADD CONSTRAINT "Lead_personId_fkey" FOREIGN KEY ("personId") REFERENCES "freelance"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
