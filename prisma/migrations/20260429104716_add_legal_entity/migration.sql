-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('FRANCHISE', 'ASSUJETTI');

-- CreateEnum
CREATE TYPE "ProcessingKind" AS ENUM ('HOSTING', 'EMBEDDED_SERVICE', 'EMAIL_PROVIDER', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "OutsideEuFramework" AS ENUM ('DATA_PRIVACY_FRAMEWORK', 'STANDARD_CONTRACTUAL_CLAUSES', 'ADEQUACY_DECISION', 'BINDING_CORPORATE_RULES');

-- CreateEnum
CREATE TYPE "LegalBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "legalEntityId" TEXT;

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalStatusKey" TEXT NOT NULL,
    "siret" TEXT,
    "vatNumber" TEXT,
    "rcsCity" TEXT,
    "rcsNumber" TEXT,
    "phone" TEXT,
    "capitalAmount" INTEGER,
    "capitalCurrency" TEXT,
    "addressId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "apeCode" TEXT NOT NULL,
    "registrationType" TEXT NOT NULL,
    "vatRegime" "VatRegime" NOT NULL,
    "publicEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataProcessing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "kind" "ProcessingKind" NOT NULL,
    "purposeFr" TEXT NOT NULL,
    "purposeEn" TEXT NOT NULL,
    "retentionPolicyKey" TEXT NOT NULL,
    "legalBasis" "LegalBasis" NOT NULL,
    "outsideEuFramework" "OutsideEuFramework",
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DataProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_slug_key" ON "LegalEntity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_siret_key" ON "LegalEntity"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_addressId_key" ON "LegalEntity"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_legalEntityId_key" ON "Publisher"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_siren_key" ON "Publisher"("siren");

-- CreateIndex
CREATE UNIQUE INDEX "DataProcessing_slug_key" ON "DataProcessing"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_legalEntityId_key" ON "Company"("legalEntityId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataProcessing" ADD CONSTRAINT "DataProcessing_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
