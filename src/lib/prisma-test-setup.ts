import { prisma } from "@/lib/prisma"

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "public"."Project", "public"."ClientMeta", "freelance"."Company", "public"."Tag", "public"."ProjectTag", "public"."DataProcessing", "public"."Publisher", "public"."LegalEntity", "public"."Address", "auth"."session", "auth"."account", "auth"."verification", "auth"."user" RESTART IDENTITY CASCADE',
  )
}

export { prisma }
