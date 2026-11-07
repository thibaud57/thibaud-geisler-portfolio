import { onTestFinished, vi } from "vitest"

import type { Prisma } from "@/generated/prisma/client"
import { personIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "public"."Project", "public"."ClientMeta", "freelance"."Company", "public"."Tag", "public"."ProjectTag", "public"."DataProcessing", "public"."Publisher", "public"."LegalEntity", "public"."Address", "freelance"."Person", "freelance"."Lead", "freelance"."Contact", "freelance"."Opportunity", "freelance"."Interview", "freelance"."Signal", "freelance"."ProspectingAction", "freelance"."WeeklyReview", "auth"."session", "auth"."account", "auth"."verification", "auth"."apikey", "auth"."user" RESTART IDENTITY CASCADE',
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

export function seedCompany(overrides: Partial<Prisma.CompanyCreateInput> = {}) {
  return prisma.company.create({ data: { slug: "acme", name: "Acme", ...overrides } })
}

export function seedCompanyWithLegalEntity(
  legalEntity: Partial<Prisma.LegalEntityCreateWithoutCompanyInput> = {},
) {
  return seedCompany({
    legalEntity: {
      create: {
        slug: "acme",
        name: "Acme SAS",
        address: {
          create: {
            street: "1 rue de l'Exemple",
            postalCode: "75000",
            city: "Paris",
            country: "FR",
          },
        },
        ...legalEntity,
      },
    },
  })
}

export function seedPerson(
  data: Partial<Prisma.PersonUncheckedCreateInput> = {},
  roles: { lead: boolean; contact: boolean } = { lead: true, contact: false },
) {
  return prisma.person.create({
    data: {
      name: "John Roe",
      ...data,
      ...(roles.lead ? { lead: { create: { origin: "OUTBOUND" } } } : {}),
      ...(roles.contact ? { contact: { create: {} } } : {}),
    },
  })
}

type TransactionWork = (tx: Prisma.TransactionClient) => Promise<unknown>

export const idOf = (person: { id: string }) => personIdSchema.parse(person.id)

export const loadPerson = (id: string) =>
  prisma.person.findUniqueOrThrow({ where: { id }, include: { lead: true, contact: true } })

// Les gardes qui précèdent l'écriture rendent une violation d'unicité ou de clé étrangère inatteignable sans course : ce helper la rejoue au point d'écriture, dans une vraie transaction. Le spy est rendu à la fin du test même s'il n'a pas servi.
export function rejectNextTransactionWrite(model: "person" | "contact", error: unknown): void {
  const transaction = prisma.$transaction.bind(prisma)
  const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce((work: TransactionWork) =>
    transaction((tx) =>
      work(
        new Proxy(tx, {
          get(target, property) {
            const value: unknown = Reflect.get(target, property)
            if (property !== model) return value
            return new Proxy(value as object, {
              get: (delegate, name): unknown =>
                name === "create"
                  ? // Erreur Prisma simulée : un objet à la forme de la réelle, pas une Error.
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    () => Promise.reject(error)
                  : Reflect.get(delegate, name),
            })
          },
        }),
      ),
    ),
  )
  onTestFinished(() => {
    spy.mockRestore()
  })
}

export { prisma }
