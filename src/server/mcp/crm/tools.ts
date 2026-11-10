import "server-only"
import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ADMIN_ASSETS_PATH } from "@/lib/admin/routes"
import { normalizeForSearch } from "@/lib/admin/search"
import { companyIdSchema } from "@/lib/ids"
import { refreshCompanyLogo } from "@/server/crm/companies"
import { mcpLoggerFor } from "@/server/mcp/logger"

import { companyLogoErrorMessage, refreshCompanyCaches } from "./entities/company"
import type { RegisteredCrmEntity, SearchHit } from "./entity-definition"
import { pageQueryShape } from "./query-page"
import { CRM_ENTITIES, CRM_ENTITY_NAMES, type CrmEntity } from "./registry"
import { guardTool, toolError, toolJson } from "./results"
import { detailsSectionSchema } from "./update-input"

type Entry = RegisteredCrmEntity<CrmEntity>

const entityField = (verb: string) =>
  z.enum(CRM_ENTITY_NAMES).describe(`Type of CRM record to ${verb}.`)

const recordIdField = z
  .string()
  .trim()
  .min(1)
  .describe("Id of the record. Get it from crm_search first.")

// Claude Code ne garde d'un oneOf racine que sa première branche (constaté le 2026-11-10) : l'agent ne voyait que les entreprises.
// La racine reste donc plate et la partie propre à chaque entité s'affiche en anyOf imbriqué, une branche par entité du registre (ADR-025).
// Elle n'est pas validée ici : le schéma strict de l'entité la reparse dans defineCrmEntity, avec des erreurs qui nomment le champ.
function perEntityPart(part: string, pick: (entry: Entry) => z.ZodObject, description: string) {
  const branches = CRM_ENTITIES.map((entry) => {
    const schema = z.toJSONSchema(pick(entry), { io: "input" }).properties?.[part]
    if (typeof schema !== "object") throw new Error(`${entry.entity} has no "${part}" schema`)
    return { title: entry.entity, description: `For entity "${entry.entity}".`, ...schema }
  })
  return z.looseObject({}).meta({ anyOf: branches }).describe(description)
}

const { sort, order, limit, offset } = pageQueryShape

const fetchInputSchema = z.strictObject({ entity: entityField("fetch"), id: recordIdField })

// Sans défaut à la racine : celui de l'entité s'applique au reparse (une revue se trie par défaut en desc).
const queryInputSchema = z.strictObject({
  entity: entityField("list"),
  filters: perEntityPart(
    "filters",
    (entry) => entry.querySchema,
    "Filters, all optional. The accepted filters depend on entity: use the branch titled with that entity.",
  ).optional(),
  sort: sort.unwrap().optional().describe("Sort key. Defaults to name."),
  order: order
    .unwrap()
    .optional()
    .describe("Sort direction. Defaults to asc, desc for a weekly review."),
  limit: limit.unwrap().optional().describe("Page size, 1 to 100. Defaults to 20."),
  offset: offset.unwrap().optional().describe("Number of rows to skip. Defaults to 0."),
})

const createInputSchema = z.strictObject({
  entity: entityField("create"),
  data: perEntityPart(
    "data",
    (entry) => entry.createSchema,
    "Fields of the new record. They depend on entity: use the branch titled with that entity.",
  ),
})

const updateInputSchema = z.strictObject({
  entity: entityField("update"),
  id: recordIdField,
  fields: perEntityPart(
    "fields",
    (entry) => entry.updateSchema,
    "Fields to change. They depend on entity: use the branch titled with that entity. A field left out stays unchanged, null clears an optional field.",
  ).optional(),
  detailsSection: detailsSectionSchema
    .optional()
    .describe(
      "Replace the body of one section of the Details. Only a company, a lead, a contact, an opportunity and an interview have Details. Do not combine with fields.details.",
    ),
})

const searchInputSchema = z.strictObject({
  query: z
    .string()
    .trim()
    .min(1)
    .describe('Name or part of the name, case and accents ignored (e.g. "societe acm").'),
  entities: z
    .array(z.enum(CRM_ENTITY_NAMES))
    .optional()
    .describe("Record types to search. All by default."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum hits, 1 to 50. Defaults to 10."),
})

const fetchCompanyLogoInputSchema = z.strictObject({
  id: companyIdSchema.describe("Id of the company. Get it from crm_search first."),
})

function withEntity(
  name: unknown,
  run: (entry: Entry) => Promise<CallToolResult>,
): Promise<CallToolResult> {
  const entry = CRM_ENTITIES.find((candidate) => candidate.entity === name)
  return entry
    ? run(entry)
    : Promise.resolve(toolError(`Unknown entity. Use one of: ${CRM_ENTITY_NAMES.join(", ")}.`))
}

// Une correspondance exacte (nom ou slug) doit passer avant la limite : coupée, l'agent croirait la fiche absente et la créerait en double.
function matchRank(needle: string, { label, hint }: SearchHit): number {
  const keys = [normalizeForSearch(label), ...(hint === null ? [] : [normalizeForSearch(hint)])]
  if (keys.some((key) => key === needle)) return 0
  return keys.some((key) => key.startsWith(needle)) ? 1 : 2
}

function rankHits(query: string, hits: readonly SearchHit[]): SearchHit[] {
  const needle = normalizeForSearch(query)
  return hits
    .map((hit) => ({ hit, rank: matchRank(needle, hit) }))
    .sort((a, b) => a.rank - b.rank || a.hit.label.localeCompare(b.hit.label))
    .map(({ hit }) => hit)
}

const crmLogger = (ctx: ServerContext) => mcpLoggerFor("crm", ctx.http?.authInfo)

export function registerCrmTools(server: McpServer): void {
  server.registerTool(
    "crm_search",
    {
      title: "Search CRM records by name",
      description:
        'Find CRM records by an approximate name, case and accents ignored. Call this first: crm_fetch and crm_update need the id it returns. Returns { results: [{ entity, id, label, hint }] }, where hint tells two homonyms apart: the slug for a company, the company and roles for a lead or contact, "client · status" for an opportunity (found by title or by the name of its client or intermediary), the label "Entretien N · type" and "opportunity title · date" for an interview (found by that label or by its opportunity title), "lead · date · status" for a prospecting action (found by its title or by the name of its lead), the type label and "company or lead · date" for a signal (found by its content), the week label ("S44 · 2026") and the closing Friday as YYYY-MM-DD for a weekly review (found by that label or that date). A person who opted out of prospecting is returned only on her exact email or LinkedIn URL, as { label: "Opposée à la prospection", optedOut: true } without name: never recreate or contact her.',
      inputSchema: searchInputSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ query, entities, limit }) => {
      const targets = entities
        ? CRM_ENTITIES.filter((entry) => entities.includes(entry.entity))
        : CRM_ENTITIES
      const hits = await Promise.all(targets.map((entry) => entry.search(query)))
      return toolJson({ results: rankHits(query, hits.flat()).slice(0, limit) })
    },
  )

  server.registerTool(
    "crm_fetch",
    {
      title: "Fetch a CRM record",
      description:
        "Fetch one CRM record by id, with its links. For a company: the legal entity, opportunities as intermediary and as client, signals and attached persons (id, name, roles lead or contact). For a lead or contact: her record, company and roles, and for a lead her referred opportunities, interviews, signals and prospecting action count. For an opportunity: its referrer (id and name, or id only when she opted out), intermediary, client and interviews. For an interview: its title, opportunity with intermediary and client, and correspondents (id and name, or id only when opted out). For a prospecting action: its fields and its lead (id and name, or id only when opted out); its day fields occurredAt and respondedAt are YYYY-MM-DD days, the format crm_create and crm_update take. For a signal: its fields and its company or its lead (id and name, or id only when opted out); occurredOn is a YYYY-MM-DD day. For a weekly review: its seven counters and its qualitative fields; closingFriday is a YYYY-MM-DD day. A person who opted out is reduced to { id, name: null, optedOut: true, optedOutAt }. Call crm_search first to get the id. Returns an error naming the id if nothing matches.",
      inputSchema: fetchInputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ entity, id }) =>
      withEntity(entity, async (entry) => {
        const record = await entry.fetch(id)
        return record
          ? toolJson(record)
          : toolError(
              `No ${entry.entity} has the id "${id}". Call crm_search to find the right id, then call crm_fetch again.`,
            )
      }),
  )

  server.registerTool(
    "crm_query",
    {
      title: "List CRM records with filters",
      description:
        "List CRM records of one entity, filtered, sorted and paginated. Use it to browse (e.g. all active companies); use crm_search to find one record by name. Returns { rows, total }: summary rows (id, name, slug or company, status, types, zones, updated date; for an opportunity id, title, status, daily rate, start month, client and intermediary; for an interview id, title (Entretien N · type), type, side, status, outcome, date, score and opportunity title; for a prospecting action id, title, channel, status, date, reply date and lead as id and name, or id only when opted out; for a signal id, type, day occurredOn, content, link, and its company or lead as id and name; for a weekly review id, closingFriday, the seven counters, status, motivation and updated date) and the total count before pagination. Persons who opted out are never listed. Page with offset. An interview has no name: sort name orders by opportunity title then date. A prospecting action is sorted by its title, and its day fields come as YYYY-MM-DD. A signal has no name: sort name orders by day. A weekly review has no name: sort name orders by closingFriday, and the default order is desc, so the first row is the last review, closingFriday as a YYYY-MM-DD day.",
      inputSchema: queryInputSchema,
      annotations: { readOnlyHint: true },
    },
    (args) => withEntity(args.entity, (entry) => entry.query(args)),
  )

  server.registerTool(
    "crm_create",
    {
      title: "Create a CRM record",
      description:
        "Create a CRM record. Call crm_search first to check it does not exist yet. For a company, only slug and name are required, and the Details get the standard section template unless you send your own. For a lead, only name and origin are required. A contact is created from its person fields, or by promoting an existing lead with { fromLeadId, types, status } and no person field. For an opportunity, only title is required: the intermediary must be a company of type ESN_RECRUTEMENT, the client must differ from the intermediary, onSiteDays cannot exceed daysPerWeek, and the Details get the standard template unless you send your own. For an interview, opportunityId, side, type and scheduledAt (ISO 8601 with its offset) are required: side ESN needs an intermediary on the opportunity, correspondentIds must be existing persons who did not opt out (create a new one with crm_create first), and the Details get the template of its type unless you send your own. For a prospecting action, personId (a lead who did not opt out and holds a lead record), title, channel and occurredAt (a day, YYYY-MM-DD) are required: the status starts at A_FAIRE and the dates follow the status rules. For a signal, exactly one of companyId or personId, type, occurredOn (a day, YYYY-MM-DD) and content are required: the type must fit the target (company: OFFRE_POSTE, LEVEE, EXPANSION, NOUVEAU_PRODUIT, PIVOT, ACQUISITION; lead: POST, COMMENTAIRE, CONFERENCE, INTERACTION) and a lead must be OUTBOUND and not opted out. For a weekly review, only closingFriday (a Friday, YYYY-MM-DD, unique: one review per week) is required: the seven counters left out are computed by the app for that week, never count them yourself, and a counter you send is kept. status (BONNE, MOYENNE, MAUVAISE), motivation (HAUTE, POSITIVE, NEUTRE, BASSE), wins, blockers, nextWeekPlan and notes are optional. No cadence check: to know the last review, call crm_query on weekly-review. A duplicate email or LinkedIn URL, or a person who opted out, is refused. The legal entity cannot be written here, nor the score of a lead. Returns the id (and the slug and name for a company, the title for an opportunity) of the new record.",
      inputSchema: createInputSchema,
    },
    (args, ctx) => withEntity(args.entity, (entry) => entry.create(args, { log: crmLogger(ctx) })),
  )

  server.registerTool(
    "crm_update",
    {
      title: "Update a CRM record",
      description:
        "Update a CRM record by id: fields (absent stays unchanged, null clears an optional field), a Details section by title, or both. Call crm_search first for the id, and crm_fetch to read the current values. Replacing one Details section leaves the others untouched. Only a company, a lead, a contact, an opportunity and an interview have Details: a signal, a prospecting action and a weekly review take fields only and refuse detailsSection. The legal entity cannot be written here, nor the score of a lead, and the record of a person who opted out is locked. The same rules as at creation apply to an opportunity, checked against its stored values when you send one field only. For an interview, correspondentIds replaces the whole list (omit it to keep it) and outcome is cleared unless the status is FAIT. For a prospecting action, a status change goes through fields.status alone: the status rules set the dates (leaving A_FAIRE takes the real sending time, REPONDU and CONVERTI set the reply date, any other status clears the reply and its date), and the lead must not have opted out. For a signal, the target never changes and the type must keep fitting it. For a weekly review, a counter left out stays unchanged and is never recomputed, and closingFriday must stay a Friday no other review holds. Returns the id (and the slug and name for a company, the title for an opportunity).",
      inputSchema: updateInputSchema,
      annotations: { idempotentHint: true },
    },
    (args, ctx) => withEntity(args.entity, (entry) => entry.update(args, { log: crmLogger(ctx) })),
  )

  server.registerTool(
    "crm_fetch_company_logo",
    {
      title: "Fetch the logo of a company",
      description:
        "Fetch the logo of a company from its website and store it in logoFilename. Call crm_search first for the id. The company needs a websiteUrl: fill it with crm_update if missing (a Wayback Machine capture works when the site cannot be read). Replaces the current logo. Returns { id, logoFilename }.",
      inputSchema: fetchCompanyLogoInputSchema,
      annotations: { idempotentHint: true },
    },
    ({ id }, ctx) => {
      const log = crmLogger(ctx)
      return guardTool(
        log,
        {
          event: "company_logo:fetch_failed",
          message:
            "The logo could not be fetched because of an internal error. Call crm_fetch to check the company's current logoFilename before retrying.",
          context: { id },
        },
        () => refreshCompanyLogo(id),
        (result) => {
          if (!result.ok) return toolError(companyLogoErrorMessage(result.error))

          revalidatePath(ADMIN_ASSETS_PATH)
          // Les pages publiques lisent logoFilename sous le tag projects
          refreshCompanyCaches()
          log.info({ event: "company_logo:fetched", id })
          return toolJson({ id, logoFilename: result.value.key })
        },
      )
    },
  )
}
