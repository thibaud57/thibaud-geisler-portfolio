-- AlterTable
ALTER TABLE "freelance"."WeeklyReview" ADD COLUMN     "refusalsReceived" INTEGER NOT NULL DEFAULT 0;


-- Un call se tient en direct : il n'a ni réponse écrite ni date de réponse.
UPDATE "freelance"."ProspectingAction" SET "status" = 'FAIT' WHERE "channel" = 'CALL' AND "status" = 'REPONDU';
UPDATE "freelance"."ProspectingAction" SET "respondedAt" = NULL, "reply" = NULL WHERE "channel" = 'CALL';
-- Une connexion acceptée est une réponse, pas une conversion.
UPDATE "freelance"."ProspectingAction" SET "status" = 'REPONDU' WHERE "channel" = 'CONNEXION_LINKEDIN' AND "status" = 'CONVERTI';
