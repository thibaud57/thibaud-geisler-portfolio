import { prisma } from "@/lib/prisma"

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Project", "ClientMeta", "freelance"."Company", "Tag", "ProjectTag", "DataProcessing", "Publisher", "LegalEntity", "Address" RESTART IDENTITY CASCADE',
  )
}

export { prisma }
