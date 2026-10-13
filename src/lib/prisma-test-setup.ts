import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "public"."Project", "public"."ClientMeta", "freelance"."Company", "public"."Tag", "public"."ProjectTag", "public"."DataProcessing", "public"."Publisher", "public"."LegalEntity", "public"."Address", "freelance"."Person", "freelance"."Lead", "freelance"."Contact", "freelance"."Opportunity", "freelance"."Interview", "freelance"."Signal", "freelance"."ProspectingAction", "freelance"."WeeklyReview", "auth"."session", "auth"."account", "auth"."verification", "auth"."user" RESTART IDENTITY CASCADE',
  )
}

export function createProject(overrides: Partial<Prisma.ProjectCreateInput> = {}) {
  return prisma.project.create({
    data: {
      slug: "project",
      titleFr: "Projet",
      titleEn: "Project",
      descriptionFr: "d",
      descriptionEn: "d",
      type: "PERSONAL",
      status: "PUBLISHED",
      ...overrides,
    },
  })
}

export { prisma }
