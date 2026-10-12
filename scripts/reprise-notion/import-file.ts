import { z } from "zod"

import { isEsn } from "@/lib/crm/companies"
import { optOutDeletesPerson } from "@/lib/crm/persons"
import { isRepliedStatus } from "@/lib/crm/prospecting-action-status"
import { companySchema, type CompanyInput } from "@/lib/schemas/company"
import { newContactSchema } from "@/lib/schemas/network-contact"
import { interviewSchema, type InterviewInput } from "@/lib/schemas/interview"
import { leadSchema } from "@/lib/schemas/lead"
import { opportunitySchema, type OpportunityInput } from "@/lib/schemas/opportunity"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import { personFields } from "@/lib/schemas/person"
import {
  prospectingActionSchema,
  type ProspectingActionInput,
} from "@/lib/schemas/prospecting-action"
import { signalSchema, type SignalInput } from "@/lib/schemas/signal"
import { weeklyReviewSchema, type WeeklyReviewInput } from "@/lib/schemas/weekly-review"
import { signalTypesFor } from "@/lib/crm/signals"

const key = z.string().min(1)
const optionalKey = key.nullable()
const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value))

const baseRecord = {
  key,
  // Date de création Notion de cette fiche : point de départ des 3 ans de conservation, jamais la date de la reprise
  createdAt: instant,
  values: z.record(z.string(), z.unknown()),
}

// Un rôle ne porte que ses champs propres : l'identité vit dans `persons`, jamais recopiée ici.
const leadRoleSchema = leadSchema.pick({
  origin: true,
  status: true,
  interest: true,
  channel: true,
  score: true,
})
const contactRoleSchema = newContactSchema.pick({ types: true, status: true })
const personSchema = z.object(personFields)

export type PersonInput = z.infer<typeof personSchema>
export type LeadRoleInput = z.infer<typeof leadRoleSchema>
export type ContactRoleInput = z.infer<typeof contactRoleSchema>

export const importFileSchema = z.object({
  companies: z.array(z.object({ ...baseRecord, existingSlug: z.string().min(1).nullable() })),
  // Une fusion (lead et contact partageant email ou LinkedIn) donne une entrée `persons`, référencée par une entrée `leads` et une entrée `contacts`.
  persons: z.array(
    z.object({
      ...baseRecord,
      companyKey: optionalKey,
      optedOutAt: instant.nullable(),
      exchangesErasedAt: instant.nullable(),
    }),
  ),
  leads: z.array(z.object({ ...baseRecord, personKey: key })),
  contacts: z.array(z.object({ ...baseRecord, personKey: key })),
  prospectingActions: z.array(z.object({ ...baseRecord, personKey: key })),
  opportunities: z.array(
    z.object({
      ...baseRecord,
      referrerKey: optionalKey,
      intermediaryKey: optionalKey,
      clientKey: optionalKey,
    }),
  ),
  interviews: z.array(
    z.object({ ...baseRecord, opportunityKey: key, correspondentKeys: z.array(key) }),
  ),
  signals: z.array(z.object({ ...baseRecord, companyKey: optionalKey, personKey: optionalKey })),
  weeklyReviews: z.array(z.object(baseRecord)),
})

export type ImportFile = z.infer<typeof importFileSchema>
type ListKey = keyof ImportFile
const LISTS = Object.keys(importFileSchema.shape) as ListKey[]
export type ListName = ListKey | "base"

export interface Issue {
  list: ListName
  key: string
  message: string
}

export interface Row<R, T> {
  record: R
  data: T
}

type RecordOf<L extends ListKey> = ImportFile[L][number]

export interface Prepared {
  companies: Row<RecordOf<"companies">, CompanyInput>[]
  persons: Row<RecordOf<"persons">, PersonInput>[]
  leads: Row<RecordOf<"leads">, LeadRoleInput>[]
  contacts: Row<RecordOf<"contacts">, ContactRoleInput>[]
  prospectingActions: Row<RecordOf<"prospectingActions">, ProspectingActionInput>[]
  opportunities: Row<RecordOf<"opportunities">, OpportunityInput>[]
  interviews: Row<RecordOf<"interviews">, InterviewInput>[]
  signals: Row<RecordOf<"signals">, SignalInput>[]
  weeklyReviews: Row<RecordOf<"weeklyReviews">, WeeklyReviewInput>[]
}

function fail(issues: Issue[], list: ListName, key: string, message: string): void {
  issues.push({ list, key, message })
}

// Les schémas de formulaire sont des `z.object` qui ignorent les clés inconnues : sans ce contrôle, une faute de frappe sur un champ optionnel retomberait sur sa valeur par défaut en silence.
function inputKeys(schema: z.ZodType): ReadonlySet<string> {
  let current: z.ZodType = schema
  while (!("shape" in current)) {
    if (!("in" in current)) throw new Error("Schéma sans forme objet : clés d'entrée introuvables")
    current = current.in as z.ZodType
  }
  return new Set(Object.keys((current as z.ZodObject).shape))
}

function parseEach<R extends { key: string; values: Record<string, unknown> }, S extends z.ZodType>(
  list: ListKey,
  records: readonly R[],
  schema: S,
  issues: Issue[],
  // Les références passent par les clés du fichier, dans les champs d'identifiant : le schéma valide la fiche entière, l'écriture les remplace ensuite par les vrais id.
  refs: (record: R) => Record<string, unknown> = () => ({}),
): Row<R, z.output<S>>[] {
  const rows: Row<R, z.output<S>>[] = []
  const known = inputKeys(schema)
  for (const record of records) {
    const references = refs(record)
    for (const name of Object.keys(record.values)) {
      if (!known.has(name)) fail(issues, list, record.key, `clé inconnue : ${name}`)
      else if (name in references) {
        fail(issues, list, record.key, `clé réservée à la référence : ${name}`)
      }
    }
    const result = schema.safeParse({ ...record.values, ...references })
    if (result.success) {
      rows.push({ record, data: result.data })
    } else {
      for (const issue of result.error.issues) {
        fail(issues, list, record.key, `${issue.path.join(".") || "fiche"} : ${issue.message}`)
      }
    }
  }
  return rows
}

function checkUnique<I>(
  list: ListKey,
  items: readonly I[],
  pick: (item: I) => { key: string; value: string | null },
  label: string,
  issues: Issue[],
): void {
  const seen = new Map<string, string>()
  for (const item of items) {
    const { key: itemKey, value } = pick(item)
    if (value === null) continue
    const other = seen.get(value)
    if (other === undefined) seen.set(value, itemKey)
    else fail(issues, list, itemKey, `${label} en double avec ${other}`)
  }
}

function keysOf(records: readonly { key: string }[]): ReadonlySet<string> {
  return new Set(records.map((r) => r.key))
}

function checkRef(
  list: ListKey,
  recordKey: string,
  ref: string | null,
  targets: ReadonlySet<string>,
  label: string,
  issues: Issue[],
): void {
  if (ref !== null && !targets.has(ref)) {
    fail(issues, list, recordKey, `${label} introuvable : ${ref}`)
  }
}

function checkReferences(file: ImportFile, issues: Issue[]): void {
  const companyKeys = keysOf(file.companies)
  const personKeys = keysOf(file.persons)
  const opportunityKeys = keysOf(file.opportunities)
  const leadPersonKeys = new Set(file.leads.map((r) => r.personKey))

  for (const r of file.persons)
    checkRef("persons", r.key, r.companyKey, companyKeys, "entreprise", issues)
  for (const r of file.leads) checkRef("leads", r.key, r.personKey, personKeys, "personne", issues)
  for (const r of file.contacts)
    checkRef("contacts", r.key, r.personKey, personKeys, "personne", issues)
  for (const r of file.prospectingActions) {
    checkRef("prospectingActions", r.key, r.personKey, personKeys, "personne", issues)
  }
  for (const r of file.opportunities) {
    checkRef(
      "opportunities",
      r.key,
      r.referrerKey,
      leadPersonKeys,
      "personne apporteuse (rôle Lead)",
      issues,
    )
    checkRef("opportunities", r.key, r.intermediaryKey, companyKeys, "ESN", issues)
    checkRef("opportunities", r.key, r.clientKey, companyKeys, "client final", issues)
  }
  for (const r of file.interviews) {
    checkRef("interviews", r.key, r.opportunityKey, opportunityKeys, "opportunité", issues)
    for (const ref of r.correspondentKeys)
      checkRef("interviews", r.key, ref, personKeys, "correspondant", issues)
  }
  for (const r of file.signals) {
    checkRef("signals", r.key, r.companyKey, companyKeys, "entreprise", issues)
    checkRef("signals", r.key, r.personKey, personKeys, "personne", issues)
  }
}

// Une personne opposée sans rôle Lead reste permise : c'est le relevé du propriétaire qui tranche.
function checkPersonStates(file: ImportFile, issues: Issue[]): void {
  const withRole = new Set([...file.leads, ...file.contacts].map((r) => r.personKey))
  for (const r of file.persons) {
    if (r.optedOutAt === null && !withRole.has(r.key)) {
      fail(issues, "persons", r.key, "aucun rôle Lead ni Contact : invisible dans l'admin")
    }
    if (r.exchangesErasedAt !== null && r.optedOutAt === null) {
      fail(
        issues,
        "persons",
        r.key,
        "échanges effacés sans opposition : erasePersonExchanges l'exige",
      )
    }
  }
}

// Règles vérifiées par les Server Actions hors des schémas (non exportées) : rejouées ici sur tout le fichier, plus les unicités que la base imposerait en transaction.
function checkRules(p: Prepared, issues: Issue[]): void {
  const companyIsEsn = new Map(
    p.companies.map((row) => [row.record.key, isEsn({ types: row.data.types ?? [] })]),
  )
  const leadOrigins = new Map(p.leads.map((row) => [row.record.personKey, row.data.origin]))
  const opportunityEsn = new Map(
    p.opportunities.map((row) => [row.record.key, row.record.intermediaryKey]),
  )

  checkUnique(
    "companies",
    p.companies,
    ({ record, data }) => ({
      key: record.key,
      value: record.existingSlug === null ? data.slug : null,
    }),
    "slug",
    issues,
  )
  checkUnique(
    "companies",
    p.companies,
    ({ record }) => ({ key: record.key, value: record.existingSlug }),
    "existingSlug",
    issues,
  )
  checkUnique(
    "persons",
    p.persons,
    ({ record, data }) => ({ key: record.key, value: data.email }),
    "email",
    issues,
  )
  checkUnique(
    "persons",
    p.persons,
    ({ record, data }) => ({ key: record.key, value: data.linkedinUrl }),
    "LinkedIn",
    issues,
  )
  checkUnique(
    "weeklyReviews",
    p.weeklyReviews,
    ({ record, data }) => ({ key: record.key, value: data.closingFriday.toISOString() }),
    "vendredi de clôture",
    issues,
  )

  // optOutPerson supprime une fiche sans email ni LinkedIn : elle ne se reprend pas
  for (const { record, data } of p.persons) {
    if (record.optedOutAt !== null && optOutDeletesPerson(data)) {
      fail(issues, "persons", record.key, "opposée sans email ni LinkedIn : à écarter")
    }
  }

  // États que optOutPerson et erasePersonExchanges ne laissent jamais derrière eux
  const opposed = new Set(
    p.persons.filter((row) => row.record.optedOutAt !== null).map((row) => row.record.key),
  )
  const erased = new Set(
    p.persons.filter((row) => row.record.exchangesErasedAt !== null).map((row) => row.record.key),
  )
  for (const { record } of p.contacts) {
    if (opposed.has(record.personKey)) {
      fail(issues, "contacts", record.key, "rôle Contact d'une personne opposée : jamais repris")
    }
  }
  for (const { record } of p.signals) {
    if (record.personKey !== null && opposed.has(record.personKey)) {
      fail(issues, "signals", record.key, "signal d'une personne opposée : supprimé à l'opposition")
    }
  }
  for (const { record } of p.prospectingActions) {
    if (erased.has(record.personKey)) {
      fail(
        issues,
        "prospectingActions",
        record.key,
        "action d'une personne dont les échanges sont effacés : jamais reprise",
      )
    }
  }
  for (const { record } of p.interviews) {
    if (record.correspondentKeys.some((k) => erased.has(k))) {
      fail(
        issues,
        "interviews",
        record.key,
        "correspondant dont les échanges sont effacés : à retirer",
      )
    }
  }

  for (const { record, data } of p.prospectingActions) {
    const replied = isRepliedStatus(data.status)
    if (replied && data.respondedAt === null) {
      fail(
        issues,
        "prospectingActions",
        record.key,
        "Répondu ou Converti sans date de réponse : reprendre la date de l'action",
      )
    }
    if (!replied && data.respondedAt !== null) {
      fail(
        issues,
        "prospectingActions",
        record.key,
        "date de réponse sur un statut sans réponse : à vider",
      )
    }
  }

  for (const { record } of p.opportunities) {
    if (record.intermediaryKey !== null && companyIsEsn.get(record.intermediaryKey) === false) {
      fail(issues, "opportunities", record.key, "ESN sans le type ESN / Recrutement")
    }
  }

  for (const { record, data } of p.interviews) {
    if (data.side === "ESN" && opportunityEsn.get(record.opportunityKey) === null) {
      fail(issues, "interviews", record.key, "mené par l'ESN d'une opportunité sans ESN")
    }
    // Notion ne porte pas l'issue par entretien : la reprise ne doit jamais en inventer une.
    if (data.outcome !== null) {
      fail(issues, "interviews", record.key, "outcome renseigné : jamais inventé à la reprise")
    }
  }

  for (const { record, data } of p.signals) {
    if ((record.companyKey === null) === (record.personKey === null)) {
      fail(issues, "signals", record.key, "un seul propriétaire, entreprise ou personne")
      continue
    }
    const owner = record.personKey === null ? "company" : "lead"
    if (!signalTypesFor(owner).includes(data.type)) {
      fail(issues, "signals", record.key, `type ${data.type} réservé à l'autre propriétaire`)
    }
    if (record.personKey === null) continue
    const origin = leadOrigins.get(record.personKey)
    if (origin === undefined) {
      fail(issues, "signals", record.key, "signal de personne réservé au rôle Lead")
    } else if (origin === "INBOUND") {
      fail(issues, "signals", record.key, "signal de personne réservé à un lead outbound")
    }
  }
}

export function prepare(file: ImportFile): { prepared: Prepared; issues: Issue[] } {
  const issues: Issue[] = []
  for (const list of LISTS) {
    checkUnique(list, file[list], (r) => ({ key: r.key, value: r.key }), "clé", issues)
  }
  // Un rôle est unique par personne, comme `Lead.personId`/`Contact.personId` en base (clé primaire).
  for (const list of ["leads", "contacts"] as const) {
    checkUnique(
      list,
      file[list],
      (r) => ({ key: r.key, value: r.personKey }),
      "rôle pour cette personne",
      issues,
    )
  }

  const prepared: Prepared = {
    companies: parseEach("companies", file.companies, companySchema, issues),
    persons: parseEach("persons", file.persons, personSchema, issues, (r) => ({
      companyId: r.companyKey ?? NONE_VALUE,
    })),
    leads: parseEach("leads", file.leads, leadRoleSchema, issues),
    contacts: parseEach("contacts", file.contacts, contactRoleSchema, issues),
    prospectingActions: parseEach(
      "prospectingActions",
      file.prospectingActions,
      prospectingActionSchema,
      issues,
      (r) => ({ personId: r.personKey }),
    ),
    opportunities: parseEach(
      "opportunities",
      file.opportunities,
      opportunitySchema,
      issues,
      (r) => ({
        referrerId: r.referrerKey ?? NONE_VALUE,
        intermediaryId: r.intermediaryKey ?? NONE_VALUE,
        clientId: r.clientKey ?? NONE_VALUE,
      }),
    ),
    interviews: parseEach("interviews", file.interviews, interviewSchema, issues, (r) => ({
      opportunityId: r.opportunityKey,
      correspondentIds: r.correspondentKeys,
      // Tous les correspondants passent par `persons` : jamais de création inline dans le fichier de reprise.
      newCorrespondents: "[]",
    })),
    signals: parseEach("signals", file.signals, signalSchema, issues),
    weeklyReviews: parseEach("weeklyReviews", file.weeklyReviews, weeklyReviewSchema, issues),
  }

  // L'entité légale reste vide (Notion n'a pas de raison sociale) et l'écriture ne porte pas ces champs : les laisser passer les perdrait en silence
  for (const r of file.companies) {
    for (const name of Object.keys(r.values).filter((n) => n.startsWith("legalEntity"))) {
      fail(issues, "companies", r.key, `entité légale non reprise : ${name}`)
    }
  }

  checkReferences(file, issues)
  checkPersonStates(file, issues)
  checkRules(prepared, issues)
  return { prepared, issues }
}
