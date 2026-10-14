-- CreateEnum
CREATE TYPE "freelance"."ReviewStatus" AS ENUM ('BONNE', 'MOYENNE', 'MAUVAISE');

-- CreateEnum
CREATE TYPE "freelance"."ReviewMotivation" AS ENUM ('HAUTE', 'POSITIVE', 'NEUTRE', 'BASSE');

-- CreateTable
CREATE TABLE "freelance"."WeeklyReview" (
    "id" TEXT NOT NULL,
    "closingFriday" DATE NOT NULL,
    "connectionsSent" INTEGER NOT NULL DEFAULT 0,
    "connectionsAccepted" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "conversationsEngaged" INTEGER NOT NULL DEFAULT 0,
    "meetingsBooked" INTEGER NOT NULL DEFAULT 0,
    "interviewsHeld" INTEGER NOT NULL DEFAULT 0,
    "activeLeads" INTEGER NOT NULL DEFAULT 0,
    "status" "freelance"."ReviewStatus",
    "motivation" "freelance"."ReviewMotivation",
    "wins" TEXT,
    "blockers" TEXT,
    "nextWeekPlan" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_closingFriday_key" ON "freelance"."WeeklyReview"("closingFriday");
