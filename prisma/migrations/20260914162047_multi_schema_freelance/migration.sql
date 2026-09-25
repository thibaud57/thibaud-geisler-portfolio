CREATE SCHEMA IF NOT EXISTS "freelance";
ALTER TABLE "public"."Company" SET SCHEMA "freelance";
ALTER TYPE "public"."CompanySize" SET SCHEMA "freelance";
ALTER TYPE "public"."CompanySector" SET SCHEMA "freelance";
