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
import type { CrmToolDocs, RegisteredCrmEntity, SearchHit } from "./entity-definition"
import { pageQueryShape } from "./query-page"
import { CRM_ENTITIES, CRM_ENTITY_BY_NAME, CRM_ENTITY_NAMES, type CrmEntity } from "./registry"
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

// Une correspondance exacte (nom ou slug) doit passer avant la limite : coupée, l'agent croirait la fiche absente et la créerait en double.
function matchRank(needle: string, { label, hint }: SearchHit): number {
  const keys = [normalizeForSearch(label), normalizeForSearch(hint)]
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

// Phrases communes en ouverture et en fin, fragments de chaque entité entre les deux, dans l'ordre du registre.
// Un fragment partagé par plusieurs entités (lead et contact) n'apparaît qu'une fois.
const docsOf = (pick: (docs: CrmToolDocs) => string | undefined): string[] => [
  ...new Set(CRM_ENTITIES.flatMap(({ docs }) => pick(docs) ?? [])),
]

const SEARCH_DESCRIPTION = `Find CRM records by an approximate name, case and accents ignored. Call this first: crm_fetch and crm_update need the id it returns. Returns { results: [{ entity, id, label, hint }] }, where hint tells two homonyms apart: ${docsOf(({ search }) => search).join(", ")}. A person who opted out of prospecting is returned only on her exact email or LinkedIn URL, as { label: "Opposée à la prospection", optedOut: true } without name: never recreate or contact her.`

const FETCH_DESCRIPTION = `Fetch one CRM record by id, with its links. ${docsOf(({ fetch }) => fetch).join(" ")} A person who opted out is reduced to { id, name: null, optedOut: true, optedOutAt }. Call crm_search first to get the id. Returns an error naming the id if nothing matches.`

const QUERY_DESCRIPTION = `List CRM records of one entity, filtered, sorted and paginated. Use it to browse (e.g. all active companies); use crm_search to find one record by name. Returns { rows, total }: summary rows (id, name, slug or company, status, types, zones, updated date; ${docsOf(({ queryRow }) => queryRow).join("; ")}) and the total count before pagination. Persons who opted out are never listed. Page with offset. ${docsOf(({ querySort }) => querySort).join(" ")}`

const CREATE_DESCRIPTION = `Create a CRM record. Call crm_search first to check it does not exist yet. ${docsOf(({ create }) => create).join(" ")} A duplicate email or LinkedIn URL, or a person who opted out, is refused. The legal entity cannot be written here, nor the score of a lead. Returns the id (and the slug and name for a company, the title for an opportunity) of the new record.`

const UPDATE_DESCRIPTION = `Update a CRM record by id: fields (absent stays unchanged, null clears an optional field), a Details section by title, or both. Call crm_search first for the id, and crm_fetch to read the current values. Replacing one Details section leaves the others untouched. Only a company, a lead, a contact, an opportunity and an interview have Details: a signal, a prospecting action and a weekly review take fields only and refuse detailsSection. The legal entity cannot be written here, nor the score of a lead, and the record of a person who opted out is locked. ${docsOf(({ update }) => update).join(" ")} Returns the id (and the slug and name for a company, the title for an opportunity).`

const crmLogger = (ctx: ServerContext) => mcpLoggerFor("crm", ctx.http?.authInfo)

const READ_FAILURE =
  "The CRM could not be read because of an internal error. Call the tool again once; if it fails again, stop and report the error."

// Sans cette garde, le SDK rendrait l'exception d'une lecture en isError brut, sans aucune ligne de log.
// Le contexte loggué ne porte jamais la requête de recherche, qui peut contenir un email.
function guardRead(
  ctx: ServerContext,
  event: string,
  context: object,
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  return guardTool(
    crmLogger(ctx),
    { event, message: READ_FAILURE, context },
    run,
    (result) => result,
  )
}

export function registerCrmTools(server: McpServer): void {
  server.registerTool(
    "crm_search",
    {
      title: "Search CRM records by name",
      description: SEARCH_DESCRIPTION,
      inputSchema: searchInputSchema,
      annotations: { readOnlyHint: true },
    },
    ({ query, entities, limit }, ctx) =>
      guardRead(ctx, "crm:search_failed", { entities }, async () => {
        const targets = entities
          ? CRM_ENTITIES.filter((entry) => entities.includes(entry.entity))
          : CRM_ENTITIES
        const hits = await Promise.all(targets.map((entry) => entry.search(query)))
        return toolJson({ results: rankHits(query, hits.flat()).slice(0, limit) })
      }),
  )

  server.registerTool(
    "crm_fetch",
    {
      title: "Fetch a CRM record",
      description: FETCH_DESCRIPTION,
      inputSchema: fetchInputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ entity, id }, ctx) =>
      guardRead(ctx, "crm:fetch_failed", { entity, id }, async () => {
        const record = await CRM_ENTITY_BY_NAME[entity].fetch(id)
        return record
          ? toolJson(record)
          : toolError(
              `No ${entity} has the id "${id}". Call crm_search to find the right id, then call crm_fetch again.`,
            )
      }),
  )

  server.registerTool(
    "crm_query",
    {
      title: "List CRM records with filters",
      description: QUERY_DESCRIPTION,
      inputSchema: queryInputSchema,
      annotations: { readOnlyHint: true },
    },
    (args, ctx) =>
      guardRead(ctx, "crm:query_failed", { entity: args.entity }, () =>
        CRM_ENTITY_BY_NAME[args.entity].query(args),
      ),
  )

  server.registerTool(
    "crm_create",
    {
      title: "Create a CRM record",
      description: CREATE_DESCRIPTION,
      inputSchema: createInputSchema,
    },
    (args, ctx) => CRM_ENTITY_BY_NAME[args.entity].create(args, { log: crmLogger(ctx) }),
  )

  server.registerTool(
    "crm_update",
    {
      title: "Update a CRM record",
      description: UPDATE_DESCRIPTION,
      inputSchema: updateInputSchema,
      annotations: { idempotentHint: true },
    },
    (args, ctx) => CRM_ENTITY_BY_NAME[args.entity].update(args, { log: crmLogger(ctx) }),
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
