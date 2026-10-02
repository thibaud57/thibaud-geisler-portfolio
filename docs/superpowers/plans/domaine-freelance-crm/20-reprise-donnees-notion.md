# Reprise des données Notion : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reprendre une fois dans la base de l'espace admin les données du CRM tenu dans Notion, remodélisées selon les modèles de l'app, puis les transférer en production.

**Architecture:** Une session Claude lit les bases Notion par le MCP et écrit, hors du dépôt, un fichier de reprise au format des formulaires de l'admin, avec un relevé des points à trancher. Un script jetable (`scripts/reprise-notion/`) valide chaque fiche avec les schémas Zod des formulaires, contrôle les références et les règles des Server Actions, puis écrit tout dans une transaction Prisma avec les dates de création Notion et récupère les logos en lot. La base de dev part en production par la procédure de dump de `docs/PRODUCTION.md`, étendue aux tables CRM ; la reprise validée, le script et les fichiers de reprise sont supprimés.

**Tech Stack:** TypeScript 6 lancé par `tsx` (`--conditions=react-server`), Prisma 7, Zod 4, MCP Notion (session Claude), PostgreSQL 18 (`pg_dump` / `pg_restore`), Wrangler (R2).

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/20-reprise-donnees-notion-design.md`

## Global Constraints

- **Prérequis** : plans `01`, `02`, `04` à `10` et `13` à `19` implémentés (schémas `src/lib/schemas/*.ts`, `applyStatusRules`, `signalTypesFor`, `retrieveCompanyLogo`) ; à partir de la Task 4, la release qui les porte est déployée en production.
- **Données personnelles hors du dépôt** : fichier de reprise et relevé dans `~/reprise-notion/`, dossier hors de tout dépôt git (ni ce dépôt, ni `freelance-toolkit`), supprimés à la Task 7 ; le dump de transfert reste dans `dumps/`, ignoré par git, et en sort à la Task 6. `dentsu.md` n'est jamais lu.
- **Base locale seulement** : le script refuse toute `DATABASE_URL` dont l'hôte n'est pas `localhost` ou `127.0.0.1` ; la production ne se remplit que par dump.
- **Dates** : `createdAt` = date de création Notion (`created_time`), jamais la date de la reprise. Tout instant porte son décalage Europe/Paris (`+01:00` en heure d'hiver, `+02:00` en heure d'été) ; une date Notion sans heure versée dans un instant vaut `T00:00:00` avec le décalage de ce jour-là. Une date qu'on ne connaît pas ne s'invente jamais.
- **Correspondances** : celles de la spec (§ Correspondances), sans règle nouvelle ; tout cas qu'elles ne tranchent pas va au relevé.
- **Entreprises du portfolio** : champs publics (slug, nom, secteurs, taille, site web, logo) gardés, Notion n'en remplit que les vides ; champs CRM repris de Notion, à condition qu'ils soient encore aux valeurs par défaut de la migration du `02`.
- **Opposition** : liste tirée du journal privé des demandes RGPD, jamais d'un statut Notion ; fiche réduite comme `optOutPerson`, portée par la personne et partagée par ses rôles.
- **Commentaires** : le pourquoi seulement, en français ; aucun JSDoc.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.
- **tdd_scope none** : aucun test unitaire, le script est jetable ; il se vérifie sur un fichier d'essai (Tasks 1 et 2), puis sur les vraies données par la simulation et le contrôle des comptes.

## Review Focus

- **Action Répondu ou Converti sans date de réponse** : `applyStatusRules` y mettrait l'heure de la reprise et repousserait de plusieurs années l'échéance de conservation ; la simulation la refuse (Task 1, fichier d'essai en erreur).
- **Entreprise du portfolio dont les champs CRM ont déjà été saisis** : les remplacer effacerait une saisie ; la simulation la signale au lieu d'écrire (Task 2, Step 2).
- **Script lancé sur une autre base que la base locale** : refus avant toute lecture du fichier (Task 1, Step 6).
- **Reprise relancée sur une base déjà remplie** : refus tant que les tables CRM ne sont pas vides, la transaction n'ayant rien laissé à moitié (Task 2, Step 5).
- **Saisie faite en production entre deux chargements** : le `TRUNCATE` l'effacerait ; la procédure la détecte avant le chargement (Task 3, puis Task 6, Step 1).

---

### Task 1 : Format du fichier de reprise et simulation

**Files:**
- Create: `scripts/reprise-notion/import-file.ts`
- Create: `scripts/reprise-notion/index.ts`
- Create: `scripts/reprise-notion/write.ts` (Task 1 n'y met que `checkDatabase` ; la Task 2 le complète)
- Modify: `Justfile` (recette `reprise-notion`, après `dev-login`)

**Interfaces:**
- Consumes: `companySchema`, `CompanyInput` (`@/lib/schemas/company`) ; `leadSchema` (`@/lib/schemas/lead`) ; `contactSchema` (`@/lib/schemas/contact`) ; `prospectingActionSchema`, `ProspectingActionInput` (`@/lib/schemas/prospecting-action`) ; `opportunitySchema`, `OpportunityInput` (`@/lib/schemas/opportunity`) ; `interviewSchema`, `InterviewInput` (`@/lib/schemas/interview`) ; `signalSchema`, `SignalInput` (`@/lib/schemas/signal`) ; `weeklyReviewSchema`, `WeeklyReviewInput` (`@/lib/schemas/weekly-review`) ; `personFields`, `NONE_VALUE` (`@/lib/schemas/person`, valeur `"aucun"`) ; `signalTypesFor(kind: SignalOwnerKind): readonly SignalType[]` (`@/lib/signals`) ; `prisma` (`@/lib/prisma`) ; `env` (`@/env`)
- Produces: `importFileSchema`, `ImportFile`, `ListName`, `Issue`, `Row<R, T>`, `Prepared`, `PersonInput`, `LeadRoleInput`, `ContactRoleInput`, `prepare(file: ImportFile): { prepared: Prepared; issues: Issue[] }` ; `checkDatabase(prepared: Prepared): Promise<Issue[]>` ; recette `just reprise-notion FILE *FLAGS`

- [ ] **Step 1 : Format du fichier et validation (`scripts/reprise-notion/import-file.ts`)**

```ts
import { z } from "zod"

import { companySchema, type CompanyInput } from "@/lib/schemas/company"
import { contactSchema } from "@/lib/schemas/contact"
import { interviewSchema, type InterviewInput } from "@/lib/schemas/interview"
import { leadSchema } from "@/lib/schemas/lead"
import { opportunitySchema, type OpportunityInput } from "@/lib/schemas/opportunity"
import { NONE_VALUE, personFields } from "@/lib/schemas/person"
import {
  prospectingActionSchema,
  type ProspectingActionInput,
} from "@/lib/schemas/prospecting-action"
import { signalSchema, type SignalInput } from "@/lib/schemas/signal"
import { weeklyReviewSchema, type WeeklyReviewInput } from "@/lib/schemas/weekly-review"
import { signalTypesFor } from "@/lib/signals"

const key = z.string().min(1)
const optionalKey = key.nullable()
const instant = z.iso.datetime({ offset: true })

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
const contactRoleSchema = contactSchema.pick({ types: true, status: true })
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

const REPLIED: ReadonlySet<string> = new Set(["REPONDU", "CONVERTI"])

function parseEach<R extends { key: string; values: Record<string, unknown> }, S extends z.ZodType>(
  list: ListKey,
  records: readonly R[],
  schema: S,
  // Les références passent par les clés du fichier, dans les champs d'identifiant : le schéma valide la fiche entière, l'écriture les remplace ensuite par les vrais id.
  refs: (record: R) => Record<string, unknown>,
  issues: Issue[],
): Row<R, z.output<S>>[] {
  const rows: Row<R, z.output<S>>[] = []
  for (const record of records) {
    const result = schema.safeParse({ ...record.values, ...refs(record) })
    if (result.success) {
      rows.push({ record, data: result.data })
      continue
    }
    for (const issue of result.error.issues) {
      issues.push({
        list,
        key: record.key,
        message: `${issue.path.join(".") || "fiche"} : ${issue.message}`,
      })
    }
  }
  return rows
}

function checkUniqueKeys(
  list: ListKey,
  records: readonly { key: string }[],
  issues: Issue[],
): ReadonlySet<string> {
  const keys = new Set<string>()
  for (const { key: recordKey } of records) {
    if (keys.has(recordKey)) issues.push({ list, key: recordKey, message: "clé en double" })
    keys.add(recordKey)
  }
  return keys
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
    issues.push({ list, key: recordKey, message: `${label} introuvable : ${ref}` })
  }
}

function checkUnique<T>(
  list: ListKey,
  rows: readonly { record: { key: string }; data: T }[],
  valueOf: (data: T) => string | null,
  label: string,
  issues: Issue[],
): void {
  const seen = new Map<string, string>()
  for (const { record, data } of rows) {
    const value = valueOf(data)
    if (value === null) continue
    const other = seen.get(value)
    if (other === undefined) seen.set(value, record.key)
    else issues.push({ list, key: record.key, message: `${label} déjà porté par ${other}` })
  }
}

// Un rôle est unique par personne, comme `Lead.personId`/`Contact.personId` en base (clé primaire) : au plus une fiche `leads` et une `contacts` par `personKey`.
function checkOneRolePerPerson(
  list: ListKey,
  records: readonly { key: string; personKey: string }[],
  issues: Issue[],
): void {
  const seen = new Map<string, string>()
  for (const record of records) {
    const other = seen.get(record.personKey)
    if (other === undefined) seen.set(record.personKey, record.key)
    else issues.push({ list, key: record.key, message: `rôle déjà porté par ${other} pour cette personne` })
  }
}

function checkReferences(
  file: ImportFile,
  companyKeys: ReadonlySet<string>,
  personKeys: ReadonlySet<string>,
  leadPersonKeys: ReadonlySet<string>,
  opportunityKeys: ReadonlySet<string>,
  issues: Issue[],
): void {
  for (const r of file.persons) checkRef("persons", r.key, r.companyKey, companyKeys, "entreprise", issues)
  for (const r of file.leads) checkRef("leads", r.key, r.personKey, personKeys, "personne", issues)
  for (const r of file.contacts) checkRef("contacts", r.key, r.personKey, personKeys, "personne", issues)
  for (const r of file.prospectingActions) {
    checkRef("prospectingActions", r.key, r.personKey, personKeys, "personne", issues)
  }
  for (const r of file.opportunities) {
    checkRef("opportunities", r.key, r.referrerKey, leadPersonKeys, "personne apporteuse (rôle Lead)", issues)
    checkRef("opportunities", r.key, r.intermediaryKey, companyKeys, "ESN", issues)
    checkRef("opportunities", r.key, r.clientKey, companyKeys, "client final", issues)
  }
  for (const r of file.interviews) {
    checkRef("interviews", r.key, r.opportunityKey, opportunityKeys, "opportunité", issues)
    for (const ref of r.correspondentKeys) checkRef("interviews", r.key, ref, personKeys, "correspondant", issues)
  }
  for (const r of file.signals) {
    checkRef("signals", r.key, r.companyKey, companyKeys, "entreprise", issues)
    checkRef("signals", r.key, r.personKey, personKeys, "personne", issues)
  }
}

// Règles vérifiées par les Server Actions hors des schémas (non exportées) : rejouées ici sur tout le fichier, plus les unicités que la base imposerait en transaction.
function checkRules(p: Prepared, issues: Issue[]): void {
  const companyTypes = new Map(p.companies.map((row) => [row.record.key, row.data.types ?? []]))
  const leadOrigins = new Map(p.leads.map((row) => [row.record.personKey, row.data.origin]))
  const opportunities = new Map(p.opportunities.map((row) => [row.record.key, row.record]))

  checkUnique(
    "companies",
    p.companies.filter((row) => row.record.existingSlug === null),
    (d) => d.slug,
    "slug",
    issues,
  )

  checkUnique("persons", p.persons, (d) => d.email, "email", issues)
  checkUnique("persons", p.persons, (d) => d.linkedinUrl, "LinkedIn", issues)
  checkUnique("weeklyReviews", p.weeklyReviews, (d) => d.closingFriday.toISOString(), "vendredi de clôture", issues)

  // optOutPerson supprime une fiche sans email ni LinkedIn : elle ne se reprend pas
  for (const { record, data } of p.persons) {
    if (record.optedOutAt !== null && data.email === null && data.linkedinUrl === null) {
      issues.push({ list: "persons", key: record.key, message: "opposée sans email ni LinkedIn : à écarter" })
    }
  }

  for (const { record, data } of p.prospectingActions) {
    if (REPLIED.has(data.status) && data.respondedAt === null) {
      issues.push({
        list: "prospectingActions",
        key: record.key,
        message: "Répondu ou Converti sans date de réponse : reprendre la date de l'action",
      })
    }
  }

  for (const { record } of p.opportunities) {
    const types = record.intermediaryKey === null ? undefined : companyTypes.get(record.intermediaryKey)
    if (types && !types.includes("ESN_RECRUTEMENT")) {
      issues.push({ list: "opportunities", key: record.key, message: "ESN sans le type ESN / Recrutement" })
    }
  }

  for (const { record, data } of p.interviews) {
    if (data.side === "ESN" && opportunities.get(record.opportunityKey)?.intermediaryKey === null) {
      issues.push({ list: "interviews", key: record.key, message: "mené par l'ESN d'une opportunité sans ESN" })
    }
    // Notion ne porte pas l'issue par entretien : la reprise ne doit jamais en inventer une.
    if (data.outcome !== null) {
      issues.push({ list: "interviews", key: record.key, message: "outcome renseigné : jamais inventé à la reprise" })
    }
  }

  for (const { record, data } of p.signals) {
    if ((record.companyKey === null) === (record.personKey === null)) {
      issues.push({ list: "signals", key: record.key, message: "un seul propriétaire, entreprise ou personne" })
      continue
    }
    if (record.personKey === null) {
      if (!signalTypesFor("company").includes(data.type)) {
        issues.push({ list: "signals", key: record.key, message: `type ${data.type} réservé à l'autre propriétaire` })
      }
      continue
    }
    if (!signalTypesFor("lead").includes(data.type)) {
      issues.push({ list: "signals", key: record.key, message: `type ${data.type} réservé à l'autre propriétaire` })
    }
    const origin = leadOrigins.get(record.personKey)
    if (origin === undefined) {
      issues.push({ list: "signals", key: record.key, message: "signal de personne réservé au rôle Lead" })
    } else if (origin === "INBOUND") {
      issues.push({ list: "signals", key: record.key, message: "signal de personne réservé à un lead outbound" })
    }
  }
}

export function prepare(file: ImportFile): { prepared: Prepared; issues: Issue[] } {
  const issues: Issue[] = []
  const companyKeys = checkUniqueKeys("companies", file.companies, issues)
  const personKeys = checkUniqueKeys("persons", file.persons, issues)
  const opportunityKeys = checkUniqueKeys("opportunities", file.opportunities, issues)
  checkUniqueKeys("leads", file.leads, issues)
  checkUniqueKeys("contacts", file.contacts, issues)
  checkUniqueKeys("prospectingActions", file.prospectingActions, issues)
  checkUniqueKeys("interviews", file.interviews, issues)
  checkUniqueKeys("signals", file.signals, issues)
  checkUniqueKeys("weeklyReviews", file.weeklyReviews, issues)
  checkOneRolePerPerson("leads", file.leads, issues)
  checkOneRolePerPerson("contacts", file.contacts, issues)

  const prepared: Prepared = {
    companies: parseEach("companies", file.companies, companySchema, () => ({}), issues),
    persons: parseEach("persons", file.persons, personSchema, (r) => ({
      companyId: r.companyKey ?? NONE_VALUE,
    }), issues),
    leads: parseEach("leads", file.leads, leadRoleSchema, () => ({}), issues),
    contacts: parseEach("contacts", file.contacts, contactRoleSchema, () => ({}), issues),
    prospectingActions: parseEach("prospectingActions", file.prospectingActions, prospectingActionSchema, (r) => ({
      personId: r.personKey,
    }), issues),
    opportunities: parseEach("opportunities", file.opportunities, opportunitySchema, (r) => ({
      referrerId: r.referrerKey ?? NONE_VALUE,
      intermediaryId: r.intermediaryKey ?? NONE_VALUE,
      clientId: r.clientKey ?? NONE_VALUE,
    }), issues),
    interviews: parseEach("interviews", file.interviews, interviewSchema, (r) => ({
      opportunityId: r.opportunityKey,
      correspondentIds: r.correspondentKeys,
      // Tous les correspondants passent par `persons` : jamais de création inline dans le fichier de reprise.
      newCorrespondents: "[]",
    }), issues),
    signals: parseEach("signals", file.signals, signalSchema, () => ({}), issues),
    weeklyReviews: parseEach("weeklyReviews", file.weeklyReviews, weeklyReviewSchema, () => ({}), issues),
  }

  const leadPersonKeys = new Set(file.leads.map((r) => r.personKey))
  checkReferences(file, companyKeys, personKeys, leadPersonKeys, opportunityKeys, issues)
  checkRules(prepared, issues)
  return { prepared, issues }
}
```

`just format` remettra la mise en forme à la largeur du projet.

- [ ] **Step 2 : Contrôles en base (`scripts/reprise-notion/write.ts`, première partie)**

```ts
import { prisma } from "@/lib/prisma"

import type { Issue, Prepared } from "./import-file"

interface CompanyCrmFields {
  types: string[]
  zones: string[]
  relationStatus: string
  notes: string | null
  details: string | null
}

// Valeurs par défaut du modèle : tant qu'elles y sont, rien n'a été saisi et Notion les remplace
function hasDefaultCrmFields(company: CompanyCrmFields): boolean {
  return (
    company.types.length === 0 &&
    company.zones.length === 0 &&
    company.relationStatus === "ACTIVE" &&
    company.notes === null &&
    company.details === null
  )
}

export async function checkDatabase(p: Prepared): Promise<Issue[]> {
  const issues: Issue[] = []
  const crmRows = await Promise.all([
    prisma.person.count(),
    prisma.lead.count(),
    prisma.prospectingAction.count(),
    prisma.contact.count(),
    prisma.opportunity.count(),
    prisma.interview.count(),
    prisma.signal.count(),
    prisma.weeklyReview.count(),
  ])
  if (crmRows.some((count) => count > 0)) {
    issues.push({
      list: "base",
      key: "tables CRM",
      message: "déjà des lignes : restaurer le point d'avant reprise (just db-reset puis just db-restore)",
    })
  }

  for (const { record, data } of p.companies) {
    if (record.existingSlug === null) {
      const taken = await prisma.company.findUnique({ where: { slug: data.slug }, select: { id: true } })
      if (taken) {
        issues.push({
          list: "companies",
          key: record.key,
          message: `slug ${data.slug} déjà pris en base : renseigner existingSlug ou changer de slug`,
        })
      }
      continue
    }
    const existing = await prisma.company.findUnique({
      where: { slug: record.existingSlug },
      select: { types: true, zones: true, relationStatus: true, notes: true, details: true },
    })
    if (!existing) {
      issues.push({ list: "companies", key: record.key, message: `entreprise du portfolio introuvable : ${record.existingSlug}` })
    } else if (!hasDefaultCrmFields(existing)) {
      issues.push({
        list: "companies",
        key: record.key,
        message: "champs CRM déjà saisis en base : à trancher au relevé avant de les remplacer",
      })
    }
  }
  return issues
}
```

- [ ] **Step 3 : Point d'entrée en simulation (`scripts/reprise-notion/index.ts`)**

```ts
import { readFileSync } from "node:fs"

import { env } from "@/env"
import { prisma } from "@/lib/prisma"

import { importFileSchema, prepare, type Prepared } from "./import-file"
import { checkDatabase } from "./write"

const [filePath, flag] = process.argv.slice(2)
if (!filePath || (flag !== undefined && flag !== "--write")) {
  throw new Error("Usage : just reprise-notion <fichier> [--write]")
}

// La production ne se remplit que par dump (docs/PRODUCTION.md) : le script n'écrit que dans une base locale
const { hostname } = new URL(env.DATABASE_URL)
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  throw new Error(`DATABASE_URL doit viser une base locale, reçu ${hostname}`)
}

const file = importFileSchema.parse(JSON.parse(readFileSync(filePath, "utf8")))
const { prepared, issues } = prepare(file)
issues.push(...(await checkDatabase(prepared)))

const lists = Object.keys(prepared) as (keyof Prepared)[]
console.table(
  Object.fromEntries(
    lists.map((list) => [list, { fichier: file[list].length, valides: prepared[list].length }]),
  ),
)
for (const issue of issues) console.log(`[${issue.list}] ${issue.key} : ${issue.message}`)

if (flag !== "--write") {
  console.log(`Simulation : ${issues.length} erreur(s), rien n'est écrit`)
  process.exitCode = issues.length > 0 ? 1 : 0
} else if (issues.length > 0) {
  console.log(`${issues.length} erreur(s) : rien n'est écrit`)
  process.exitCode = 1
}

await prisma.$disconnect()
```

- [ ] **Step 4 : Recette `reprise-notion`**

Dans `Justfile`, après la recette `dev-login` :

```just
# Reprise unique du CRM Notion dans la DB de dev : simulation par défaut, --write pour écrire
[group('db')]
reprise-notion FILE *FLAGS:
    # react-server : @/lib/prisma importe server-only, qui lève hors d'un Server Component et se résout en module vide sous cette condition
    pnpm exec tsx --conditions=react-server scripts/reprise-notion/index.ts {{ FILE }} {{ FLAGS }}
```

- [ ] **Step 5 : Typage et lint**

Run: `just format && just typecheck && just lint`
Expected: aucune erreur.

- [ ] **Step 6 : Fichier d'essai valide, puis en erreur**

Créer `~/reprise-notion/essai.json`, données fictives :

```json
{
  "companies": [
    {
      "key": "c-esn",
      "createdAt": "2024-02-01T09:00:00+01:00",
      "existingSlug": null,
      "values": {
        "slug": "reprise-essai-esn",
        "name": "Reprise Essai ESN",
        "sectors": ["ESN_CONSEIL"],
        "size": "PME",
        "websiteUrl": "",
        "logoFilename": "",
        "types": ["ESN_RECRUTEMENT"],
        "relationStatus": "ACTIVE",
        "zones": ["LUXEMBOURG"],
        "notes": "",
        "details": "# 🏢 À propos\n\nESN d'essai."
      }
    },
    {
      "key": "c-client",
      "createdAt": "2024-02-02T09:00:00+01:00",
      "existingSlug": null,
      "values": {
        "slug": "reprise-essai-client",
        "name": "Reprise Essai Client",
        "sectors": ["ASSURANCE"],
        "size": "",
        "websiteUrl": "https://example.com",
        "logoFilename": "",
        "types": ["CLIENT_FINAL"],
        "relationStatus": "DORMANTE",
        "zones": ["LUXEMBOURG"],
        "notes": "",
        "details": ""
      }
    }
  ],
  "persons": [
    {
      "key": "p-lea",
      "createdAt": "2024-03-15T10:00:00+01:00",
      "companyKey": "c-esn",
      "optedOutAt": null,
      "exchangesErasedAt": null,
      "values": {
        "name": "Léa Essai",
        "jobRole": "RECRUTEUR",
        "zone": "LUXEMBOURG",
        "email": "lea.essai@example.com",
        "phone": "",
        "linkedinUrl": "",
        "metAt": "2024-03-15",
        "notes": "",
        "details": ""
      }
    },
    {
      "key": "p-marc",
      "createdAt": "2024-04-02T11:00:00+02:00",
      "companyKey": "c-client",
      "optedOutAt": null,
      "exchangesErasedAt": null,
      "values": {
        "name": "Marc Essai",
        "jobRole": "CTO",
        "zone": "",
        "email": "",
        "phone": "",
        "linkedinUrl": "https://www.linkedin.com/in/marc-essai",
        "metAt": "",
        "notes": "",
        "details": ""
      }
    }
  ],
  "leads": [
    {
      "key": "l-in",
      "createdAt": "2024-03-15T10:00:00+01:00",
      "personKey": "p-lea",
      "values": {
        "origin": "INBOUND",
        "status": "DISCUSSION",
        "interest": "HOT",
        "channel": "LINKEDIN",
        "score": "7"
      }
    },
    {
      "key": "l-out",
      "createdAt": "2024-04-02T11:00:00+02:00",
      "personKey": "p-marc",
      "values": {
        "origin": "OUTBOUND",
        "status": "SUSPECT",
        "interest": "aucun",
        "channel": "LINKEDIN",
        "score": ""
      }
    }
  ],
  "contacts": [
    {
      "key": "c-lea",
      "createdAt": "2024-03-20T09:00:00+01:00",
      "personKey": "p-lea",
      "values": {
        "types": ["PARTENAIRE"],
        "status": "ACTIF"
      }
    }
  ],
  "prospectingActions": [
    {
      "key": "a1",
      "createdAt": "2024-03-15T10:05:00+01:00",
      "personKey": "p-lea",
      "values": {
        "title": "Réponse à l'annonce",
        "channel": "DM_LINKEDIN",
        "status": "REPONDU",
        "occurredAt": "2024-03-15T00:00:00+01:00",
        "respondedAt": "2024-03-15T00:00:00+01:00",
        "message": ""
      }
    }
  ],
  "opportunities": [
    {
      "key": "o1",
      "createdAt": "2024-03-15T10:10:00+01:00",
      "referrerKey": "p-lea",
      "intermediaryKey": "c-esn",
      "clientKey": "c-client",
      "values": {
        "title": "Opportunité d'essai",
        "role": "",
        "status": "ACCEPTEE",
        "dailyRate": "600",
        "contract": "FREELANCE",
        "workMode": "HYBRIDE",
        "daysPerWeek": "5",
        "onSiteDays": "2",
        "zone": "LUXEMBOURG",
        "startMonth": "2024-05",
        "durationMonths": "6",
        "notes": "",
        "details": ""
      }
    }
  ],
  "interviews": [
    {
      "key": "i1",
      "createdAt": "2024-03-18T09:00:00+01:00",
      "opportunityKey": "o1",
      "correspondentKeys": ["p-lea"],
      "values": {
        "side": "ESN",
        "type": "PREMIER_CONTACT",
        "status": "FAIT",
        "outcome": "aucun",
        "scheduledAt": "2024-03-20T14:00:00+01:00",
        "score": "",
        "decision": "",
        "notes": "",
        "details": ""
      }
    }
  ],
  "signals": [
    {
      "key": "s1",
      "createdAt": "2024-02-02T09:05:00+01:00",
      "companyKey": "c-client",
      "personKey": null,
      "values": {
        "type": "LEVEE",
        "occurredOn": "2026-03-01",
        "content": "Série A",
        "sourceUrl": "https://example.com/levee"
      }
    }
  ],
  "weeklyReviews": [
    {
      "key": "w1",
      "createdAt": "2024-03-22T18:00:00+01:00",
      "values": {
        "closingFriday": "2024-03-22",
        "connectionsSent": "10",
        "connectionsAccepted": "4",
        "messagesSent": "6",
        "conversationsEngaged": "2",
        "meetingsBooked": "1",
        "interviewsHeld": "1",
        "activeLeads": "3",
        "status": "BONNE",
        "motivation": "HAUTE",
        "wins": "",
        "blockers": "",
        "nextWeekPlan": "",
        "notes": ""
      }
    }
  ]
}
```

`c-lea` fusionne sur `p-lea` : la personne porte les deux rôles, chacun avec sa propre date de création Notion. Son type de contact (`PARTENAIRE`) est choisi librement : rien ne le déduit plus automatiquement du poste.

Run: `just reprise-notion ~/reprise-notion/essai.json`
Expected : le tableau donne pour chaque liste autant de fiches valides que dans le fichier (2, 2, 2, 1, 1, 1, 1, 1, 1), aucune erreur, « Simulation : 0 erreur(s), rien n'est écrit ».

Copier le fichier en `~/reprise-notion/essai-erreurs.json` et y changer : `persons[1].values.email` en `"lea.essai@example.com"`, `prospectingActions[0].values.respondedAt` en `""`, `signals[0].personKey` en `"p-marc"`, `weeklyReviews[0].values.closingFriday` en `"2024-03-21"`.

Run: `just reprise-notion ~/reprise-notion/essai-erreurs.json`
Expected : quatre erreurs au moins, `[persons] p-marc : email déjà porté par p-lea`, `[prospectingActions] a1 : Répondu ou Converti sans date de réponse…`, `[signals] s1 : un seul propriétaire, entreprise ou personne`, `[weeklyReviews] w1 : closingFriday : Choisissez un vendredi` ; code de sortie 1.

Run: `just reprise-notion ~/reprise-notion/essai-erreurs.json --write`
Expected : « … erreur(s) : rien n'est écrit », aucune ligne en base (`just db-studio`).

---

### Task 2 : Écriture en une transaction et logos en lot

**Files:**
- Modify: `scripts/reprise-notion/write.ts` (écriture, logos)
- Modify: `scripts/reprise-notion/index.ts` (branche `--write`)

**Interfaces:**
- Consumes: `Prepared`, `Row`, `Issue` (Task 1) ; `applyStatusRules(current: ActionTiming | null, next: ActionTiming, now: Date): ActionTiming` (`@/lib/prospecting-action-status`) ; `retrieveCompanyLogo(websiteUrl: string, slug: string): Promise<CompanyLogo>` (`@/server/company-logo/fetch-company-logo`, `CompanyLogo.key` au format `freelance/crm/entreprises/<slug>/logo-<12 hex>.png`) ; `OPTED_OUT_CLEARED` (`@/lib/persons`, `07`)
- Produces: `writeAll(prepared: Prepared): Promise<void>` ; `fetchMissingLogos(prepared: Prepared): Promise<LogoFailure[]>` ; `LogoFailure { slug: string; reason: string }`

- [ ] **Step 1 : Écriture (`scripts/reprise-notion/write.ts`, à la suite de `checkDatabase`)**

Compléter les imports :

```ts
import { OPTED_OUT_CLEARED } from "@/lib/persons"
import { prisma } from "@/lib/prisma"
import { applyStatusRules } from "@/lib/prospecting-action-status"
import type { CompanyInput } from "@/lib/schemas/company"
import { retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"

import type { Issue, Prepared } from "./import-file"
```

Puis ajouter :

```ts
function idOf(ids: ReadonlyMap<string, string>, key: string): string {
  const id = ids.get(key)
  if (id === undefined) throw new Error(`Clé sans fiche écrite : ${key}`)
  return id
}

function optionalIdOf(ids: ReadonlyMap<string, string>, key: string | null): string | null {
  return key === null ? null : idOf(ids, key)
}

function crmFields(data: CompanyInput) {
  return {
    types: data.types,
    relationStatus: data.relationStatus,
    zones: data.zones,
    notes: data.notes,
    details: data.details,
  }
}

interface PortfolioCompany {
  id: string
  sectors: CompanyInput["sectors"]
  size: CompanyInput["size"]
  websiteUrl: string | null
  logoFilename: string | null
}

// Les champs publics alimentent le site publié : Notion n'en remplit que les vides
function portfolioMerge(existing: PortfolioCompany, data: CompanyInput) {
  return {
    sectors: existing.sectors.length > 0 ? existing.sectors : data.sectors,
    size: existing.size ?? data.size,
    websiteUrl: existing.websiteUrl ?? data.websiteUrl,
    logoFilename: existing.logoFilename ?? data.logoFilename,
    ...crmFields(data),
  }
}

export async function writeAll(p: Prepared): Promise<void> {
  const now = new Date()
  await prisma.$transaction(
    async (tx) => {
      const companyIds = new Map<string, string>()
      for (const { record, data } of p.companies) {
        if (record.existingSlug === null) {
          const { id } = await tx.company.create({
            data: {
              slug: data.slug,
              name: data.name,
              sectors: data.sectors,
              size: data.size,
              websiteUrl: data.websiteUrl,
              logoFilename: data.logoFilename,
              ...crmFields(data),
              createdAt: new Date(record.createdAt),
            },
            select: { id: true },
          })
          companyIds.set(record.key, id)
          continue
        }
        const existing = await tx.company.findUniqueOrThrow({
          where: { slug: record.existingSlug },
          select: { id: true, sectors: true, size: true, websiteUrl: true, logoFilename: true },
        })
        await tx.company.update({ where: { id: existing.id }, data: portfolioMerge(existing, data) })
        companyIds.set(record.key, existing.id)
      }

      // Un rôle référence l'id de la personne (Lead.personId/Contact.personId sont aussi leur clé primaire) : une seule map suffit pour rôles, opportunités, entretiens et signaux.
      const personIds = new Map<string, string>()
      for (const { record, data } of p.persons) {
        const { id } = await tx.person.create({
          data: {
            ...data,
            companyId: optionalIdOf(companyIds, record.companyKey),
            createdAt: new Date(record.createdAt),
            ...(record.optedOutAt === null
              ? {}
              : { ...OPTED_OUT_CLEARED, optedOutAt: new Date(record.optedOutAt) }),
            ...(record.exchangesErasedAt === null
              ? {}
              : { exchangesErasedAt: new Date(record.exchangesErasedAt) }),
          },
          select: { id: true },
        })
        personIds.set(record.key, id)
      }

      for (const { record, data } of p.leads) {
        await tx.lead.create({
          data: { ...data, personId: idOf(personIds, record.personKey), createdAt: new Date(record.createdAt) },
        })
      }

      for (const { record, data } of p.contacts) {
        await tx.contact.create({
          data: { ...data, personId: idOf(personIds, record.personKey), createdAt: new Date(record.createdAt) },
        })
      }

      for (const { record, data } of p.prospectingActions) {
        await tx.prospectingAction.create({
          data: {
            ...data,
            ...applyStatusRules(null, data, now),
            personId: idOf(personIds, record.personKey),
            createdAt: new Date(record.createdAt),
          },
        })
      }

      const opportunityIds = new Map<string, string>()
      for (const { record, data } of p.opportunities) {
        const { id } = await tx.opportunity.create({
          data: {
            ...data,
            referrerId: optionalIdOf(personIds, record.referrerKey),
            intermediaryId: optionalIdOf(companyIds, record.intermediaryKey),
            clientId: optionalIdOf(companyIds, record.clientKey),
            createdAt: new Date(record.createdAt),
          },
          select: { id: true },
        })
        opportunityIds.set(record.key, id)
      }

      for (const { record, data } of p.interviews) {
        await tx.interview.create({
          data: {
            side: data.side,
            type: data.type,
            status: data.status,
            outcome: data.outcome,
            scheduledAt: data.scheduledAt,
            score: data.score,
            decision: data.decision,
            notes: data.notes,
            details: data.details,
            opportunityId: idOf(opportunityIds, record.opportunityKey),
            correspondents: { connect: record.correspondentKeys.map((key) => ({ id: idOf(personIds, key) })) },
            createdAt: new Date(record.createdAt),
          },
        })
      }

      for (const { record, data } of p.signals) {
        await tx.signal.create({
          data: {
            ...data,
            companyId: optionalIdOf(companyIds, record.companyKey),
            personId: optionalIdOf(personIds, record.personKey),
            createdAt: new Date(record.createdAt),
          },
        })
      }

      for (const { record, data } of p.weeklyReviews) {
        await tx.weeklyReview.create({ data: { ...data, createdAt: new Date(record.createdAt) } })
      }
    },
    // Des centaines d'écritures en série : le délai par défaut de 5 s ne suffit pas
    { timeout: 300_000 },
  )
}

export interface LogoFailure {
  slug: string
  reason: string
}

// Hors transaction : un site lent ou sans icône ne doit pas annuler la reprise
export async function fetchMissingLogos(p: Prepared): Promise<LogoFailure[]> {
  const slugs = p.companies.map(({ record, data }) => record.existingSlug ?? data.slug)
  const companies = await prisma.company.findMany({
    where: { slug: { in: slugs }, logoFilename: null, websiteUrl: { not: null } },
    select: { id: true, slug: true, websiteUrl: true },
  })
  const failures: LogoFailure[] = []
  for (const company of companies) {
    if (company.websiteUrl === null) continue
    try {
      const logo = await retrieveCompanyLogo(company.websiteUrl, company.slug)
      await prisma.company.update({ where: { id: company.id }, data: { logoFilename: logo.key } })
    } catch (err) {
      failures.push({ slug: company.slug, reason: err instanceof Error ? err.message || err.name : String(err) })
    }
  }
  return failures
}
```

Déplacer l'import `import { prisma } from "@/lib/prisma"` et l'import de type de `./import-file` écrits à la Task 1 dans ce bloc d'imports, sans doublon.

- [ ] **Step 2 : Branche `--write` (`scripts/reprise-notion/index.ts`)**

Remplacer l'import `import { checkDatabase } from "./write"` par :

```ts
import { checkDatabase, fetchMissingLogos, writeAll } from "./write"
```

Remplacer le bloc `if (flag !== "--write") { … } else if (issues.length > 0) { … }` par :

```ts
if (flag !== "--write") {
  console.log(`Simulation : ${issues.length} erreur(s), rien n'est écrit`)
  process.exitCode = issues.length > 0 ? 1 : 0
} else if (issues.length > 0) {
  console.log(`${issues.length} erreur(s) : rien n'est écrit`)
  process.exitCode = 1
} else {
  await writeAll(prepared)
  console.log("Reprise écrite en une transaction")
  const failures = await fetchMissingLogos(prepared)
  for (const failure of failures) console.log(`[logo] ${failure.slug} : ${failure.reason}`)
  console.log(`Logos : ${failures.length} échec(s), à déposer depuis la page de l'entreprise`)
}
```

- [ ] **Step 3 : Typage et lint**

Run: `just format && just typecheck && just lint`
Expected: aucune erreur.

- [ ] **Step 4 : Écrire le fichier d'essai sur la base de dev**

Run: `just db-dump` (point de restauration ; noter le nom affiché)
Run: `just reprise-notion ~/reprise-notion/essai.json --write`
Expected : « Reprise écrite en une transaction », puis `[logo] reprise-essai-client : …` (example.com ne publie pas d'icône) et « Logos : 1 échec(s)… ».

Contrôler dans l'admin (`just dev`, connexion) :
- `/admin/entreprises` : « Reprise Essai ESN » avec son client final « Reprise Essai Client » (dérivé de l'opportunité Acceptée), statut Dormante pour ce dernier ;
- `/admin/leads/tous` : « Léa Essai » s'affiche « Deal » (opportunité acceptée), porte aussi le rôle Contact (Partenaire), « À conserver jusqu'au » 15/03/2027 ; « Marc Essai » porte son LinkedIn ;
- page de « Reprise Essai Client » : card Signaux, « Levée », mars 2026, lien ;
- `/admin/opportunites` : « Opportunité d'essai », Acceptée, TJM 600 ; sa page montre l'entretien « Premier contact » du 20/03/2024, Fait, sans issue ;
- `/admin/revues-hebdo` : la revue « S12 · Semaine du 18/03/2024 » (vendredi de clôture 22/03/2024).

- [ ] **Step 5 : Relance refusée, puis restauration**

Run: `just reprise-notion ~/reprise-notion/essai.json --write`
Expected : `[base] tables CRM : déjà des lignes…` et `[companies] c-esn : slug reprise-essai-esn déjà pris en base…`, rien n'est écrit.

Run: `just db-reset` puis `just db-restore dumps/<point noté au Step 4>`
Expected : les deux entreprises d'essai et les fiches CRM ont disparu, les six entreprises du portfolio sont là. Supprimer `~/reprise-notion/essai*.json` et, s'il existe, l'objet `freelance/crm/entreprises/reprise-essai-*` du bucket `portfolio-admin-dev` (aucun ici, l'icône ayant échoué).

---

### Task 3 : Procédure de transfert étendue au CRM

**Files:**
- Modify: `docs/PRODUCTION.md` (§ Backup & Recovery > Procédure : Remplir la base depuis un dump de dev)

**Interfaces:**
- Consumes: tables CRM des plans `07` à `19` (`freelance."Person"`, `"Lead"`, `"ProspectingAction"`, `"Contact"`, `"Opportunity"`, `"Interview"`, `"WeeklyReview"`, `"Signal"`, `"_InterviewCorrespondents"`)
- Produces: procédure suivie à la Task 6

- [ ] **Step 1 : Remplacer les étapes de la procédure**

Dans `docs/PRODUCTION.md`, remplacer la liste numérotée de « Procédure : Remplir la base depuis un dump de dev » (étapes 1 à 5, bloc bash compris ; le blockquote d'en-tête et l'avertissement final restent) par :

````markdown
1. Seulement après le déploiement dont les migrations ont créé le schéma du dump : `just db-dump` ne produit que des données, schéma `auth` exclu
2. **Vérifier que la production n'a pas bougé depuis le dernier chargement**, le `TRUNCATE` effaçant toute saisie faite depuis. Même requête sur la production et sur la base de dev avant les ajouts à transférer :
   ```bash
   sudo docker exec -i $(sudo docker ps --format '{{.Names}}' | grep portfolio-db) sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
   SELECT 'Project' AS t, count(*), max("updatedAt") FROM public."Project"
   UNION ALL SELECT 'ClientMeta', count(*), max("updatedAt") FROM public."ClientMeta"
   UNION ALL SELECT 'Tag', count(*), max("updatedAt") FROM public."Tag"
   UNION ALL SELECT 'ProjectTag', count(*), NULL FROM public."ProjectTag"
   UNION ALL SELECT 'Company', count(*), max("updatedAt") FROM freelance."Company"
   UNION ALL SELECT 'Publisher', count(*), max("updatedAt") FROM public."Publisher"
   UNION ALL SELECT 'DataProcessing', count(*), max("updatedAt") FROM public."DataProcessing"
   UNION ALL SELECT 'LegalEntity', count(*), max("updatedAt") FROM public."LegalEntity"
   UNION ALL SELECT 'Address', count(*), max("updatedAt") FROM public."Address"
   UNION ALL SELECT 'Person', count(*), NULL FROM freelance."Person"
   UNION ALL SELECT 'Lead', count(*), NULL FROM freelance."Lead"
   UNION ALL SELECT 'ProspectingAction', count(*), NULL FROM freelance."ProspectingAction"
   UNION ALL SELECT 'Contact', count(*), NULL FROM freelance."Contact"
   UNION ALL SELECT 'Opportunity', count(*), NULL FROM freelance."Opportunity"
   UNION ALL SELECT 'Interview', count(*), NULL FROM freelance."Interview"
   UNION ALL SELECT 'Signal', count(*), NULL FROM freelance."Signal"
   UNION ALL SELECT 'WeeklyReview', count(*), NULL FROM freelance."WeeklyReview";
   SQL
   ```
   Sur la base de dev : `docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev' <<'SQL'`, même requête. Les comptes doivent être égaux et aucun `max("updatedAt")` de production postérieur au dernier chargement (date du blockquote ci-dessus). Sinon, reporter en dev les saisies faites en production, puis refaire le dump
3. Copier le dump sur le VPS (`scp`), puis dans le container de la base : `sudo docker cp <dump> $(sudo docker ps --format '{{.Names}}' | grep portfolio-db):/tmp/content.dump`, et supprimer la copie de l'hôte
4. Vider les tables de contenu et charger le dump dans une seule transaction, `_prisma_migrations` exclue :
   ```bash
   sudo docker exec $(sudo docker ps --format '{{.Names}}' | grep portfolio-db) sh -c '
   pg_restore -l /tmp/content.dump | grep -v _prisma_migrations > /tmp/content.list
   { echo "BEGIN; TRUNCATE public.\"ProjectTag\", public.\"ClientMeta\", public.\"Project\", public.\"Tag\", freelance.\"Signal\", freelance.\"_InterviewCorrespondents\", freelance.\"Interview\", freelance.\"Opportunity\", freelance.\"ProspectingAction\", freelance.\"Contact\", freelance.\"Lead\", freelance.\"WeeklyReview\", freelance.\"Person\", freelance.\"Company\", public.\"Publisher\", public.\"DataProcessing\", public.\"LegalEntity\", public.\"Address\";"
     pg_restore --data-only --disable-triggers -L /tmp/content.list -f - /tmp/content.dump
     echo "COMMIT;"; } | psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -v ON_ERROR_STOP=1 && rm -f /tmp/content.*'
   ```
5. **Logos d'entreprise** : copier de `portfolio-admin-dev` vers `portfolio-admin` chaque objet que la base référence ; recopier un logo déjà présent en production le remplace par le même fichier. Liste des clés, sur la base de dev :
   ```bash
   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev -At' <<'SQL' > logos.txt
   SELECT "logoFilename" FROM freelance."Company" WHERE "logoFilename" LIKE 'freelance/crm/entreprises/%';
   SQL
   while read -r key; do
     wrangler r2 object get "portfolio-admin-dev/$key" --remote --jurisdiction eu --file logo.png
     wrangler r2 object put "portfolio-admin/$key" --remote --jurisdiction eu --file logo.png --content-type image/png
   done < logos.txt
   ```
   Relire chaque objet copié (`wrangler r2 object get "portfolio-admin/$key" --remote --jurisdiction eu --file relu.png`) : pour une clé `logo-<hash>.png`, les 12 premiers caractères de `sha256sum relu.png` égalent ce hash ; pour une autre clé, `sha256sum` donne la même empreinte sur l'objet de dev et sur celui de production. Supprimer ensuite `logos.txt`, `logo.png` et `relu.png`
6. Redeploy du Compose : le cache `'use cache'` vit en mémoire, et un chargement SQL ne le revalide pas
7. Smoke test : accueil, `/projets`, une page projet, puis dans l'admin la liste des entreprises et, si le dump porte le CRM, celles des leads et des opportunités
````

- [ ] **Step 2 : Relecture**

Relire la section entière : le blockquote d'en-tête (« Exécutée en production le 2026-09-25… ») et l'avertissement final (« Un échec annule toute la transaction… ») restent inchangés, les numéros se suivent, aucune autre section ne renvoie à un numéro d'étape de cette procédure (`grep -n "Remplir la base" docs/PRODUCTION.md`).

---

### Task 4 : Export de Notion et relevé des points à trancher

Tâche menée par une session Claude avec le MCP Notion et le propriétaire ; aucun fichier du dépôt n'est modifié.

**Files:**
- Create (hors dépôt): `~/reprise-notion/reprise.json`
- Create (hors dépôt): `~/reprise-notion/releve.md`

**Interfaces:**
- Consumes: format `importFileSchema` (Task 1) ; correspondances de la spec (§ Correspondances) ; références du toolkit `C:\Users\thiba\Desktop\work\freelance-toolkit\.claude\skills\crm-doc\references\*.json` et `entretiens-doc\references\entretien.json` (identifiants des bases, propriétés, options)
- Produces: un fichier de reprise que la simulation accepte sans erreur

- [ ] **Step 1 : Préalables**

Vérifier, avant toute lecture de Notion :
- la release qui porte `01` à `19` est en production (`/fr/confidentialite` affiche la puce « Prospection et relations professionnelles », `/admin/leads/tous` répond) ;
- aucune fiche CRM n'a été saisie en production depuis ce déploiement (sinon la reporter en dev, la Task 6 l'exigeant) ;
- le propriétaire fournit, depuis son journal privé des demandes RGPD, la liste des personnes opposées : identité, date de la demande, effacement des échanges demandé ou non. Elle ne s'écrit que dans `~/reprise-notion/releve.md`.

À partir de ce moment, le propriétaire n'écrit plus dans le CRM Notion (skills `crm-doc` et `entretiens-doc` du toolkit comprises) : toute saisie passe par l'admin, après la reprise.

- [ ] **Step 2 : Comptes Notion**

Pour chaque base (Entreprises, Leads & Opportunités, Actions Prospection, Contacts & Relations, Reviews Hebdo, Suivi Entretiens), compter les pages par `mcp__notion-query__notion_query_data_source_by_values` sur son `dataSourceId`. Noter les comptes dans `releve.md`, section « Comptes », en tableau `Base | Notion | Fichier | Écart expliqué`.

- [ ] **Step 3 : Construire le fichier de reprise**

Lire chaque page (propriétés par la requête, corps par `mcp__plugin_Notion_notion__notion-fetch`) et écrire `~/reprise-notion/reprise.json` au format `importFileSchema`, en appliquant les correspondances de la spec :

| Liste | `values` (format des formulaires) | Hors `values` |
|---|---|---|
| `companies` | `slug` (kebab-case du nom, 60 caractères au plus), `name`, `sectors`, `size` (`""` si inconnue), `websiteUrl`, `logoFilename` (`""`), `types` (Prospect abandonné), `relationStatus`, `zones`, `notes`, `details` ; champs `legalEntity*` omis, l'entité légale reste vide faute de raison sociale dans Notion | `existingSlug` (slug d'une des six entreprises du portfolio, retrouvée par nom ou site web, sinon `null`) |
| `persons` | `name`, `jobRole` (`"aucun"` si vide), `zone` (`"aucun"` si vide, inconnue ou après arbitrage de la plus précise), `email`, `phone`, `linkedinUrl`, `metAt`, `notes`, `details` | `companyKey`, `optedOutAt`, `exchangesErasedAt` |
| `leads` | `origin`, `status`, `interest` (`"aucun"` si Unknown ou vide), `channel` (`"aucun"` si vide), `score` (`"0"` à `"10"` ou `""`) | `personKey` |
| `contacts` | `types`, `status` | `personKey` |
| `prospectingActions` | `title`, `channel`, `status`, `occurredAt`, `respondedAt` (= `occurredAt` pour Répondu et Converti, `""` sinon), `message` | `personKey` |
| `opportunities` | `title`, `role`, `status`, `dailyRate`, `contract`, `workMode`, `daysPerWeek`, `onSiteDays`, `zone` (`"aucun"` si vide ou après arbitrage), `startMonth` (`AAAA-MM` ou `""`), `durationMonths`, `notes`, `details` (`"aucun"` pour un choix vide) | `referrerKey`, `intermediaryKey`, `clientKey` |
| `interviews` | `side`, `type`, `status`, `outcome` (`"aucun"` toujours, Notion ne le distingue pas par entretien), `scheduledAt`, `score`, `decision` (`"aucun"` sauf 🎬 sans ambiguïté), `notes`, `details` | `opportunityKey`, `correspondentKeys` |
| `signals` | `type`, `occurredOn` (`AAAA-MM-JJ`, au 1er du mois si la source ne donne que le mois), `content`, `sourceUrl` | `companyKey` ou `personKey`, jamais les deux |
| `weeklyReviews` | `closingFriday` (`AAAA-MM-JJ`), sept compteurs (chaînes de chiffres), `status`, `motivation`, `wins`, `blockers`, `nextWeekPlan`, `notes` | aucun |

Règles communes :
- `key` = identifiant de la page Notion ; `createdAt` d'une fiche `leads` ou `contacts` = son `created_time` de rôle ; `createdAt` d'une entrée `persons` = le plus ancien `created_time` des fiches fusionnées en elle ; pour une opportunité reconstituée, la date de création de la page qui la décrit en premier (lead, premier entretien ou hub) ;
- instants (`occurredAt`, `respondedAt`, `scheduledAt`) avec le décalage Europe/Paris du jour ; date sans heure → `T00:00:00` et ce décalage ;
- corps de page découpé section par section selon la spec : une section reprise en Détails garde son titre `# <emoji> <titre>`, sous `persons.values.details` qu'elle vienne du lead ou du contact fusionnés ; une ligne 📡 ou 🔍 datée devient une fiche `signals` et sort des Détails ; 📋 Mission, Informations Mission, Package et Budget & Facturation vont à l'opportunité ; Politique ESN, Informations Startup et Culture & Vision vont aux Détails de l'entreprise concernée ; sections de préparation des entretiens et formule Logo.dev ignorées ;
- **fusion** : un lead et un contact Notion qui partagent l'email ou le LinkedIn (forme normalisée par `normalizeLinkedinProfileUrl`, `07`) donnent une entrée `persons`, une entrée `leads` et une entrée `contacts` référençant la même `personKey` ; un champ divergent entre les deux sources prend la valeur de la fiche la plus récente, l'autre valeur va au relevé ; un interlocuteur d'entretien qui n'est ni lead ni contact devient une entrée `persons` et une entrée `contacts`, dont le type va au relevé des points à trancher ;
- **clients finaux d'une ESN** : chaque client final saisi devient une entrée `opportunities` `ACCEPTEE`, titre « Opportunité chez `<client>` via `<ESN>` », `referrerKey` nul, aucune date ni TJM, sauf si une opportunité reconstituée couvre déjà ce couple ;
- **dates d'entreprise reportées en action** : une « Date de premier contact » plus ancienne que toute action déjà construite vers une personne de l'entreprise devient une entrée `prospectingActions` « Premier contact » (`channel "AUTRE"`, `status "FAIT"`, `occurredAt` = cette date à 00:00 Paris) vers la personne la plus anciennement créée de l'entreprise ; une « Dernière interaction » de contact plus tardive que toute action déjà construite vers cette personne devient de même une entrée « Dernier échange » sur elle ;
- personne opposée : fiche complète dans `persons`, `optedOutAt` à la date de sa demande ; effacement demandé → `exchangesErasedAt` posé et ni ses actions, ni ses signaux, ni sa présence parmi les `correspondentKeys` ne sont écrits ;
- `dentsu.md`, pages Équipe, Chantiers et comptes-rendus des hubs clients ne sont pas lus.

- [ ] **Step 4 : Relevé des points à trancher**

Écrire `~/reprise-notion/releve.md` avec, en plus des sections « Comptes » et « Oppositions » :
- **Entreprises du portfolio retrouvées** : clé Notion → `existingSlug` ;
- **Tailles** : entreprises en 1-50, Startup ou Grand compte, avec la valeur proposée ;
- **Fusions** : chaque couple lead/contact fusionné, les champs divergents et la valeur retenue ;
- **Types des interlocuteurs sans rôle** : chaque interlocuteur d'entretien qui n'est ni lead ni contact, avec le type de contact proposé ;
- **Opportunités** : chaque opportunité reconstituée avec ses sources (chaîne d'entretiens, 📋 Mission d'un lead, bandeau de hub, client final d'une ESN) et les fusions proposées ;
- **Clients finaux absents des entreprises Notion** : créer l'entreprise ou garder le nom dans les Détails de l'opportunité ;
- **Entreprises travaillées sans couverture** : chaque entreprise marquée Travaillé dans Notion sans projet `CLIENT` ni opportunité `ACCEPTEE` après reprise ;
- **Leads RDV planifié sans entretien daté**, **personnes liées à plusieurs entreprises**, **actions sans personne**, **doublons d'email ou de LinkedIn** ;
- **Localités multiples** : chaque personne ou opportunité dont Notion porte plusieurs zones, la plus précise retenue et les autres écartées ;
- **Signaux restés en Détails** (sans date ou de type hors liste) ;
- **Décisions d'entretien** déduites de 🎬.

Chaque ligne porte la clé Notion et la proposition. Le propriétaire répond ligne à ligne ; la session reporte ses réponses dans `reprise.json`.

- [ ] **Step 5 : Simulation jusqu'à zéro erreur**

Run: `just reprise-notion ~/reprise-notion/reprise.json`
Expected : « Simulation : 0 erreur(s)… » ; sinon corriger le fichier (ou le relevé, puis le fichier) et relancer. Le tableau « fichier / valides » doit égaler la colonne « Fichier » du relevé.

---

### Task 5 : Reprise dans la base de dev et contrôle

**Files:**
- Aucun fichier du dépôt ; `dumps/` (ignoré par git) reçoit le point de restauration et le dump de transfert

**Interfaces:**
- Consumes: `~/reprise-notion/reprise.json` accepté par la simulation (Task 4) ; requête de contrôle de la procédure (Task 3, étape 2)
- Produces: base de dev reprise, dump de transfert

- [ ] **Step 1 : État de départ**

Lancer sur la base de dev la requête de contrôle de la procédure (Task 3, étape 2) et garder le résultat dans `releve.md`, section « Dev avant reprise » : c'est la référence de comparaison de la Task 6.

Run: `just db-dump` (point de restauration, noter le nom)

- [ ] **Step 2 : Écriture**

Run: `just reprise-notion ~/reprise-notion/reprise.json --write`
Expected : « Reprise écrite en une transaction », puis la liste des logos en échec. Pour chacun, déposer le logo depuis la page de l'entreprise (dépôt manuel, sub-project `10` de l'espace admin) ou laisser l'entreprise sans logo.

- [ ] **Step 3 : Contrôle des comptes**

Comparer chaque liste de l'admin (Entreprises > Toutes, Leads > Tous, Actions de prospection > Journal, Contacts, Opportunités, Entretiens > Journal, Revues hebdo > Journal) à la colonne « Fichier » du relevé, elle-même égale à la colonne « Notion » aux écarts expliqués près (fusions et opportunités créées depuis les clients finaux comprises). Puis, pour chaque entreprise marquée Travaillé dans Notion, vérifier qu'elle porte un projet de type `CLIENT` ou une opportunité `ACCEPTEE` après reprise ; lister les écarts dans `releve.md`.

- [ ] **Step 4 : Contrôle ponctuel**

Ouvrir dans l'admin, face à la page Notion correspondante :
- trois entreprises, dont une du portfolio (champs publics inchangés, champs CRM de Notion) et une avec des signaux (type, date au jour ou au mois, lien) ;
- trois leads, dont un Deal (statut Discussion, affiché « Deal », opportunité acceptée), une personne fusionnée (rôle Lead et rôle Contact sur la même fiche) et le lead le plus ancien (« À conserver jusqu'au » = sa création Notion + 3 ans, ou sa dernière réponse + 3 ans) ;
- trois actions (date, heure, statut, message), dont une « Premier contact » ou « Dernier échange » reconstituée si le relevé en porte une, un contact, une opportunité reconstituée de plusieurs sources, une opportunité créée depuis un client final, deux entretiens (titre et numéro déduits, statut et issue), une revue (compteurs, taux) ;
- chaque personne opposée (fiche réduite, date de la demande, `exchangesErasedAt` si l'effacement a été demandé).

Un écart se corrige dans `reprise.json` : restaurer le point (`just db-reset`, `just db-restore dumps/<point>`), puis refaire les Steps 2 à 4.

- [ ] **Step 5 : Dump de transfert**

Run: `just db-dump`
Expected : un nouveau fichier dans `dumps/` ; c'est lui que la Task 6 charge. Il porte des données personnelles : il ne quitte `dumps/` que pour le VPS.

---

### Task 6 : Transfert en production

**Files:**
- Modify: `docs/PRODUCTION.md` (blockquote d'en-tête de la procédure : date et comptes de ce chargement)

**Interfaces:**
- Consumes: procédure de la Task 3 ; dump de la Task 5 ; section « Dev avant reprise » du relevé
- Produces: CRM en production

- [ ] **Step 1 : Contrôle de la production**

Lancer la requête de l'étape 2 de la procédure sur la production et la comparer à « Dev avant reprise » : comptes égaux, tables CRM vides, aucun `max("updatedAt")` postérieur au 2026-09-25. Sinon, arrêter : reporter en dev les saisies faites en production, puis reprendre la Task 5 depuis le Step 1.

- [ ] **Step 2 : Chargement**

Suivre les étapes 3 à 7 de la procédure avec le dump de transfert, logos compris.
Expected : transaction validée (aucune erreur `psql`), chaque logo relu avec son hash, smoke test passé.

- [ ] **Step 3 : Contrôle en production**

Refaire en production le contrôle des comptes (Task 5, Step 3) et deux fiches du contrôle ponctuel (un lead Deal, une entreprise avec signal et logo).

- [ ] **Step 4 : Traces**

Dans `docs/PRODUCTION.md`, remplacer le blockquote d'en-tête de la procédure par :

```markdown
> Exécutée en production le 2026-09-25 (11 projets, 6 entreprises, 47 tags), puis le <date du chargement> pour la reprise du CRM Notion (<n> entreprises, <n> personnes dont <n> fusions, <n> leads, <n> contacts, <n> actions, <n> opportunités dont <n> depuis un client final, <n> entretiens, <n> signaux, <n> revues), chaque fois après répétition sur une base locale à l'état de la prod.
```

en y portant la date et les comptes relevés au Step 3. Puis supprimer le dump de transfert et le point de restauration de `dumps/`.

---

### Task 7 : Fin de la reprise

**Files:**
- Modify: `Justfile` (recette `reprise-notion` retirée)
- Delete: `scripts/reprise-notion/`
- Delete (hors dépôt): `~/reprise-notion/`

**Interfaces:**
- Consumes: reprise validée en production (Task 6)
- Produces: dépôt sans script de reprise, aucune copie des données hors de la base

- [ ] **Step 1 : Retrait du script et des fichiers de reprise**

Une fois la reprise validée en production, supprimer `scripts/reprise-notion/` et, dans `Justfile`, la recette `reprise-notion` avec son commentaire et son attribut `[group('db')]`. Supprimer `~/reprise-notion/` (fichier de reprise, relevé, liste des oppositions).

Run: `git grep -n "reprise-notion" -- '*.ts' Justfile`
Expected : aucune ligne.

- [ ] **Step 2 : Quality gate**

Run: `just lint && just typecheck && just test`
Expected : tout passe.
