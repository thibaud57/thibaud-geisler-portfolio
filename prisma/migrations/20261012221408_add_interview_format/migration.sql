-- CreateEnum
CREATE TYPE "freelance"."InterviewFormat" AS ENUM ('PRESENTIEL', 'VISIO', 'TELEPHONE');

-- AlterTable
ALTER TABLE "freelance"."Interview" ADD COLUMN     "format" "freelance"."InterviewFormat";
