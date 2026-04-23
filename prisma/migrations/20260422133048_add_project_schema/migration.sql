-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('CLIENT', 'PERSONAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectFormat" AS ENUM ('API', 'WEB_APP', 'MOBILE_APP', 'DESKTOP_APP', 'CLI', 'IA');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('FREELANCE', 'CDI', 'STAGE', 'ALTERNANCE');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('PRESENTIEL', 'HYBRIDE', 'REMOTE');

-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'DATABASE', 'INFRA', 'AI', 'EXPERTISE');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('TPE', 'PME', 'ETI', 'GROUPE');

-- CreateEnum
CREATE TYPE "CompanySector" AS ENUM ('ASSURANCE', 'FINTECH', 'SAAS', 'SERVICES_RH', 'ESN_CONSEIL', 'LOGICIELS_ENTREPRISE', 'ECOMMERCE', 'IA_AUTOMATISATION', 'EMARKETING', 'BANQUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CompanyLocation" AS ENUM ('LUXEMBOURG', 'PARIS', 'GRAND_EST', 'FRANCE', 'BELGIQUE', 'SUISSE', 'EUROPE', 'MONDE');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "formats" "ProjectFormat"[],
    "startedAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "githubUrl" TEXT,
    "demoUrl" TEXT,
    "coverFilename" TEXT,
    "caseStudyMarkdown" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMeta" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "teamSize" INTEGER,
    "contractStatus" "ContractStatus",
    "workMode" "WorkMode" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClientMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoFilename" TEXT,
    "websiteUrl" TEXT,
    "sectors" "CompanySector"[],
    "size" "CompanySize",
    "locations" "CompanyLocation"[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TagKind" NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTag" (
    "projectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("projectId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMeta_projectId_key" ON "ClientMeta"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ProjectTag_projectId_displayOrder_idx" ON "ProjectTag"("projectId", "displayOrder");

-- AddForeignKey
ALTER TABLE "ClientMeta" ADD CONSTRAINT "ClientMeta_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMeta" ADD CONSTRAINT "ClientMeta_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
