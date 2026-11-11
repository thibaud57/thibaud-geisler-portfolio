import { onTestFinished, vi } from "vitest"

import type { Prisma } from "@/generated/prisma/client"
import {
  companyIdSchema,
  opportunityIdSchema,
  personIdSchema,
  projectIdSchema,
  tagIdSchema,
} from "@/lib/ids"
import { prisma } from "@/lib/prisma"

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "public"."Project", "public"."ClientMeta", "freelance"."Company", "public"."Tag", "public"."ProjectTag", "public"."DataProcessing", "public"."Publisher", "public"."LegalEntity", "public"."Address", "freelance"."Person", "freelance"."Lead", "freelance"."Contact", "freelance"."Opportunity", "freelance"."Interview", "freelance"."Signal", "freelance"."ProspectingAction", "freelance"."WeeklyReview", "auth"."session", "auth"."account", "auth"."verification", "auth"."apikey", "auth"."user" RESTART IDENTITY CASCADE',
  )
}

export const SEED_USER_ID = "user-1"

export function seedUser() {
  return prisma.user.create({
    data: {
      id: SEED_USER_ID,
      name: "Jane Doe",
      email: "jane@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
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

// Tout projet a un ClientMeta (invariant du domaine) : `createProject` seul crée un projet nu, réservé aux tests de lecture.
export function seedProject(companyId: string, overrides: Partial<Prisma.ProjectCreateInput> = {}) {
  return createProject({
    clientMeta: { create: { workMode: "REMOTE", company: { connect: { id: companyId } } } },
    ...overrides,
  })
}

export function seedTag(overrides: Partial<Prisma.TagUncheckedCreateInput> = {}) {
  return prisma.tag.create({
    data: { slug: "react", nameFr: "React", nameEn: "React", kind: "FRAMEWORK", ...overrides },
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

export const seedEsn = () =>
  seedCompany({ slug: "esn", name: "Esn Corp", types: ["ESN_RECRUTEMENT"] })

export async function seedOpportunity(data: Partial<Prisma.OpportunityUncheckedCreateInput> = {}) {
  const row = await prisma.opportunity.create({ data: { title: "Plateforme data", ...data } })
  return opportunityIdSchema.parse(row.id)
}

export const OPTED_OUT_AT = new Date("2026-10-01T00:00:00Z")

// Un lead opposé n'a plus de nom : seuls ses identifiants permettent de le retrouver.
export const seedOptedOutLead = (
  identity: { email?: string; linkedinUrl?: string } = { email: "john.roe@example.com" },
) => seedPerson({ name: null, optedOutAt: OPTED_OUT_AT, ...identity })

// Semaine close le vendredi 2026-10-30 (du samedi 24 au vendredi 30, heure de Paris) : une action ou un entretien hors de ses bornes prouve qu'ils ne comptent pas.
export const CLOSED_WEEK_FRIDAY = "2026-10-30"

export const CLOSED_WEEK_COUNTS = {
  connectionsSent: 2,
  connectionsAccepted: 1,
  messagesSent: 1,
  conversationsEngaged: 1,
  meetingsBooked: 1,
  interviewsHeld: 1,
  activeLeads: 1,
} as const

export async function seedClosedWeek(): Promise<void> {
  const jane = await seedPerson({ name: "Jane Doe" })
  await prisma.lead.update({ where: { personId: jane.id }, data: { status: "DISCUSSION" } })
  const action = (
    data: Omit<Prisma.ProspectingActionUncheckedCreateInput, "personId" | "title">,
  ) => ({
    personId: jane.id,
    title: "Action de la semaine",
    ...data,
  })
  await prisma.prospectingAction.createMany({
    data: [
      action({ channel: "CONNEXION_LINKEDIN", status: "FAIT", occurredAt: "2026-10-26T09:00:00Z" }),
      action({
        channel: "CONNEXION_LINKEDIN",
        status: "REPONDU",
        occurredAt: "2026-10-27T09:00:00Z",
        respondedAt: "2026-10-28T09:00:00Z",
      }),
      action({
        channel: "DM_LINKEDIN",
        status: "CONVERTI",
        occurredAt: "2026-10-27T10:00:00Z",
        respondedAt: "2026-10-29T10:00:00Z",
      }),
      action({ channel: "CONNEXION_LINKEDIN", status: "FAIT", occurredAt: "2026-10-31T09:00:00Z" }),
    ],
  })
  const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })
  const interview = (scheduledAt: string): Prisma.InterviewCreateManyInput => ({
    opportunityId: opportunity.id,
    side: "CLIENT_FINAL",
    type: "TECHNIQUE",
    status: "FAIT",
    scheduledAt,
  })
  await prisma.interview.createMany({
    data: [interview("2026-10-28T13:00:00Z"), interview("2026-10-23T13:00:00Z")],
  })
}

type TransactionWork = (tx: Prisma.TransactionClient) => Promise<unknown>

export const sequence = (length: number) => Array.from({ length }, (_, index) => index + 1)

export const slugsAndOrders = (rows: readonly { slug: string; displayOrder: number }[]) => ({
  slugs: rows.map(({ slug }) => slug),
  orders: rows.map(({ displayOrder }) => displayOrder),
})

export async function storedProjectTags(projectId: string) {
  const links = await prisma.projectTag.findMany({
    where: { projectId },
    orderBy: { displayOrder: "asc" },
    include: { tag: true },
  })
  return slugsAndOrders(links.map(({ tag, displayOrder }) => ({ slug: tag.slug, displayOrder })))
}

export const idOf = (person: { id: string }) => personIdSchema.parse(person.id)

export const tagIdOf = (tag: { id: string }) => tagIdSchema.parse(tag.id)

export const projectIdOf = (project: { id: string }) => projectIdSchema.parse(project.id)

export const companyIdOf = (company: { id: string }) => companyIdSchema.parse(company.id)

export const storedAction = (id: string) =>
  prisma.prospectingAction.findUniqueOrThrow({ where: { id } })

export const storedSignal = (id: string) => prisma.signal.findUniqueOrThrow({ where: { id } })

export const storedReview = (id: string) => prisma.weeklyReview.findUniqueOrThrow({ where: { id } })

export const loadPerson = (id: string) =>
  prisma.person.findUniqueOrThrow({ where: { id }, include: { lead: true, contact: true } })

// Remplace, dans une vraie transaction, un appel que les gardes rendent inatteignable sans course. Le spy est rendu à la fin du test même sans usage.
export function stubNextTransactionCall(
  model: "person" | "contact" | "interview" | "prospectingAction" | "project",
  method: "create" | "update" | "findUnique",
  stub: () => Promise<unknown>,
): void {
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
                name === method ? stub : Reflect.get(delegate, name),
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

// Rejoue au point d'écriture une violation d'unicité ou de clé étrangère que les gardes rendent inatteignable sans course.
export function rejectNextTransactionWrite(
  model: "person" | "contact" | "interview" | "prospectingAction",
  error: unknown,
  method: "create" | "update" = "create",
): void {
  // Erreur Prisma simulée : un objet à la forme de la réelle, pas une Error.
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
  stubNextTransactionCall(model, method, () => Promise.reject(error))
}

export { prisma }
