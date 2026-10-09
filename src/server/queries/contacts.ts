import "server-only"

import type {
  ContactStatus,
  ContactType,
  JobRole,
  LeadInterest,
  LeadStatus,
  Prisma,
  Zone,
} from "@/generated/prisma/client"
import { activityEndOf, CONTACT_REVIEW_YEARS } from "@/lib/person-retention"
import { prisma } from "@/lib/prisma"

const companySelect = { select: { id: true, name: true, logoFilename: true } } as const

const contactRecordInclude = { person: { include: { company: companySelect } } } as const

const adminContactInclude = {
  person: {
    include: {
      company: companySelect,
      lead: { select: { status: true, interest: true } },
    },
  },
} as const

type ContactRow = Prisma.ContactGetPayload<{ include: typeof contactRecordInclude }>
type AdminContactRow = Prisma.ContactGetPayload<{ include: typeof adminContactInclude }>

// La personne aplatie sur son rôle Contact, sans le calcul propre à la liste : la page d'édition ne lit que ceci.
export interface ContactRecord {
  id: string
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  metAt: Date | null
  notes: string | null
  details: string | null
  // Création du rôle, pas de la personne : promouvoir un lead ancien en contact ne doit pas faire expirer aussitôt sa revue.
  createdAt: Date
  company: { id: string; name: string; logoFilename: string | null } | null
  types: ContactType[]
  status: ContactStatus
}

export interface AdminContact extends ContactRecord {
  leadRole: { status: LeadStatus; interest: LeadInterest | null } | null
  lastInteractionAt: Date | null
  reviewAt: Date
}

interface InteractionDates {
  occurredAt: Date | null
  respondedAt: Date | null
}

// Hors À faire seulement : une action encore à faire n'a pas eu lieu. Réponse et envoi comptent à égalité, la plus tardive des deux datant le dernier échange connu.
const PERFORMED_ACTIONS = { status: { not: "A_FAIRE" } } as const

function latestInteractionOf(max: InteractionDates | undefined): Date | null {
  const dates = [max?.occurredAt, max?.respondedAt].filter(
    (date): date is Date => date !== null && date !== undefined,
  )
  return dates.length > 0 ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null
}

function toContactRecord(row: ContactRow): ContactRecord {
  return {
    id: row.personId,
    name: row.person.name,
    jobRole: row.person.jobRole,
    zone: row.person.zone,
    email: row.person.email,
    phone: row.person.phone,
    linkedinUrl: row.person.linkedinUrl,
    metAt: row.person.metAt,
    notes: row.person.notes,
    details: row.person.details,
    createdAt: row.createdAt,
    company: row.person.company,
    types: row.types,
    status: row.status,
  }
}

function toAdminContact(
  row: AdminContactRow,
  interaction: InteractionDates | undefined,
): AdminContact {
  const lastInteractionAt = latestInteractionOf(interaction)
  return {
    ...toContactRecord(row),
    leadRole: row.person.lead,
    lastInteractionAt,
    // Une personne opposée n'a jamais de rôle Contact : seule la revue métier se lit ici, jamais le délai légal.
    // `lastInteractionAt` tient lieu de « dernière réponse » faute de réponse propre au réseau.
    reviewAt: activityEndOf(row.createdAt, lastInteractionAt, CONTACT_REVIEW_YEARS),
  }
}

// Sans `use cache`, comme les autres lectures admin : elle relit la base juste après ses propres mutations.
export async function findAllContactsForAdmin(): Promise<AdminContact[]> {
  const [rows, interactions] = await Promise.all([
    prisma.contact.findMany({
      include: adminContactInclude,
      orderBy: { person: { name: { sort: "asc", nulls: "last" } } },
    }),
    prisma.prospectingAction.groupBy({
      by: ["personId"],
      where: { ...PERFORMED_ACTIONS, person: { contact: { isNot: null } } },
      _max: { occurredAt: true, respondedAt: true },
    }),
  ])
  const maxByPerson = new Map(interactions.map((group) => [group.personId, group._max]))
  return rows.map((row) => toAdminContact(row, maxByPerson.get(row.personId)))
}

export async function findContactByIdForAdmin(personId: string): Promise<ContactRecord | null> {
  const row = await prisma.contact.findUnique({
    where: { personId },
    include: contactRecordInclude,
  })
  return row ? toContactRecord(row) : null
}
