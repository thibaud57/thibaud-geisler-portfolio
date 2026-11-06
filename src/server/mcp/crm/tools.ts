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
import { CRM_ENTITIES, CRM_ENTITY_NAMES, type CrmEntity } from "./registry"
import { guardTool, toolError, toolJson } from "./results"

const [firstEntity, ...otherEntities] = CRM_ENTITIES

type Entry = RegisteredCrmEntity<CrmEntity>

function fetchSchemaFor(entry: Entry) {
  return z.strictObject({
    entity: z.literal(entry.entity).describe("Type of CRM record to fetch."),
    id: z.string().trim().min(1).describe("Id of the record. Get it from crm_search first."),
  })
}

// Une entité ajoutée au registre entre dans chaque union sans toucher aux outils (ADR-025)
function unionOf<T extends z.ZodObject>(pick: (entry: Entry) => T) {
  return z.discriminatedUnion("entity", [pick(firstEntity), ...otherEntities.map(pick)])
}

const fetchInputSchema = unionOf(fetchSchemaFor)
const queryInputSchema = unionOf((entry) => entry.querySchema)
const createInputSchema = unionOf((entry) => entry.createSchema)
const updateInputSchema = unionOf((entry) => entry.updateSchema)

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
        "Find CRM records by an approximate name, case and accents ignored. Call this first: crm_fetch and crm_update need the id it returns. Returns { results: [{ entity, id, label, hint }] }, where hint is the slug for a company and tells two homonyms apart.",
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
        "Fetch one CRM record by id, with its links. For a company: the legal entity, opportunities as intermediary and as client, signals and attached persons (id, name, roles lead or contact). Call crm_search first to get the id. Returns an error naming the id if nothing matches.",
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
        "List CRM records of one entity, filtered, sorted and paginated. Use it to browse (e.g. all active companies); use crm_search to find one record by name. Returns { rows, total }: summary rows (id, name, slug, status, types, zones, updated date) and the total count before pagination. Page with offset.",
      inputSchema: queryInputSchema,
      annotations: { readOnlyHint: true },
    },
    (args) => withEntity(args["entity"], (entry) => entry.query(args)),
  )

  server.registerTool(
    "crm_create",
    {
      title: "Create a CRM record",
      description:
        "Create a CRM record. Call crm_search first to check it does not exist yet. For a company, only slug and name are required, and the Details get the standard section template unless you send your own. The legal entity cannot be written here. Returns the id, slug and name of the new record.",
      inputSchema: createInputSchema,
    },
    (args, ctx) =>
      withEntity(args["entity"], (entry) => entry.create(args, { log: crmLogger(ctx) })),
  )

  server.registerTool(
    "crm_update",
    {
      title: "Update a CRM record",
      description:
        "Update a CRM record by id: fields (absent stays unchanged, null clears an optional field), a Details section by title, or both. Call crm_search first for the id, and crm_fetch to read the current values. Replacing one Details section leaves the others untouched. The legal entity cannot be written here. Returns the id, slug and name.",
      inputSchema: updateInputSchema,
      annotations: { idempotentHint: true },
    },
    (args, ctx) =>
      withEntity(args["entity"], (entry) => entry.update(args, { log: crmLogger(ctx) })),
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
