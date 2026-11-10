import "server-only"
import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server"
import { z } from "zod"

import { normalizeForSearch } from "@/lib/admin/search"
import type { McpDomain } from "@/lib/mcp-domains"

import type { RegisteredEntity, SearchHit, ToolDocs } from "./entity-definition"
import { mcpLoggerFor, type McpLogger } from "./logger"
import { pageQueryShape } from "./query-page"
import { guardTool, toolError, toolJson } from "./results"
import { detailsSectionSchema } from "./update-input"

interface ToolText {
  title: string
  description: string
}

export interface DomainToolTexts {
  recordNoun: string
  fetchNotFound: (entity: string, id: string) => string
  readFailure: string
  queryOrderDescription: string
  search: ToolText
  fetch: ToolText
  query: ToolText
  create: ToolText
  update: ToolText
}

export interface McpDomainConfig<E extends string> {
  prefix: McpDomain
  entities: readonly RegisteredEntity<E>[]
  byName: Record<E, RegisteredEntity<E>>
  texts: DomainToolTexts
  // Présent : `_update` déclare le `detailsSection` racine avec ce texte (seul le CRM a des Détails)
  detailsSectionDescription?: string
  registerExtraTools?: (server: McpServer, logger: (ctx: ServerContext) => McpLogger) => void
}

export const INSTANTS = "Dates with a time are ISO 8601 in Paris time, with their offset."

// Fragments des entités dans l'ordre du registre, sans doublon : lead et contact partagent le leur.
export const docsOf = (
  entities: readonly { docs: ToolDocs }[],
  pick: (docs: ToolDocs) => string | undefined,
): string[] => [...new Set(entities.flatMap(({ docs }) => pick(docs) ?? []))]

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

const { sort, order, limit, offset } = pageQueryShape

// Schémas construits une fois par domaine, au chargement : le McpServer, lui, reste neuf par requête (`http-handler.md`).
export function domainToolsOf<E extends string>(
  domain: McpDomainConfig<E>,
): (server: McpServer) => void {
  const { prefix, entities, byName, texts } = domain
  const entityNames = entities.map(({ entity }) => entity)
  const logger = (ctx: ServerContext) => mcpLoggerFor(prefix, ctx.http?.authInfo)

  const entityField = (verb: string) =>
    z.enum(entityNames).describe(`Type of ${texts.recordNoun} to ${verb}.`)

  const recordIdField = z
    .string()
    .trim()
    .min(1)
    .describe(`Id of the record. Get it from ${prefix}_search first.`)

  // Claude Code ne garde que la 1re branche d'un oneOf racine (constaté le 2026-11-10) : anyOf imbriqué, non validé ici, reparsé en strict par l'entité (ADR-025).
  const perEntityPart = (
    part: string,
    pick: (entry: RegisteredEntity<E>) => z.ZodObject,
    description: string,
  ) => {
    const branches = entities.map((entry) => {
      const schema = z.toJSONSchema(pick(entry), { io: "input" }).properties?.[part]
      if (typeof schema !== "object") throw new Error(`${entry.entity} has no "${part}" schema`)
      return { title: entry.entity, description: `For entity "${entry.entity}".`, ...schema }
    })
    return z.looseObject({}).meta({ anyOf: branches }).describe(description)
  }

  const searchInputSchema = z.strictObject({
    query: z
      .string()
      .trim()
      .min(1)
      .describe('Name or part of the name, case and accents ignored (e.g. "societe acm").'),
    entities: z
      .array(z.enum(entityNames))
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
    order: order.unwrap().optional().describe(texts.queryOrderDescription),
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
    ...(domain.detailsSectionDescription !== undefined && {
      detailsSection: detailsSectionSchema.optional().describe(domain.detailsSectionDescription),
    }),
  })

  // Sans garde le SDK rend l'exception sans log ; le contexte loggué exclut la requête de recherche, qui peut porter un email.
  const guardRead = (
    ctx: ServerContext,
    event: string,
    context: object,
    run: () => Promise<CallToolResult>,
  ): Promise<CallToolResult> =>
    guardTool(
      logger(ctx),
      { event: `${prefix}:${event}`, message: texts.readFailure, context },
      run,
      (result) => result,
    )

  return (server) => {
    server.registerTool(
      `${prefix}_search`,
      {
        title: texts.search.title,
        description: texts.search.description,
        inputSchema: searchInputSchema,
        annotations: { readOnlyHint: true },
      },
      ({ query, entities: wanted, limit: max }, ctx) =>
        guardRead(ctx, "search_failed", { entities: wanted }, async () => {
          const targets = wanted
            ? entities.filter(({ entity }) => wanted.includes(entity))
            : entities
          const hits = await Promise.all(targets.map((entry) => entry.search(query)))
          return toolJson({ results: rankHits(query, hits.flat()).slice(0, max) })
        }),
    )

    server.registerTool(
      `${prefix}_fetch`,
      {
        title: texts.fetch.title,
        description: texts.fetch.description,
        inputSchema: fetchInputSchema,
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      ({ entity, id }, ctx) =>
        guardRead(ctx, "fetch_failed", { entity, id }, async () => {
          const record = await byName[entity].fetch(id)
          return record ? toolJson(record) : toolError(texts.fetchNotFound(entity, id))
        }),
    )

    server.registerTool(
      `${prefix}_query`,
      {
        title: texts.query.title,
        description: texts.query.description,
        inputSchema: queryInputSchema,
        annotations: { readOnlyHint: true },
      },
      (args, ctx) =>
        guardRead(ctx, "query_failed", { entity: args.entity }, () =>
          byName[args.entity].query(args),
        ),
    )

    server.registerTool(
      `${prefix}_create`,
      {
        title: texts.create.title,
        description: texts.create.description,
        inputSchema: createInputSchema,
      },
      (args, ctx) => byName[args.entity].create(args, { log: logger(ctx) }),
    )

    server.registerTool(
      `${prefix}_update`,
      {
        title: texts.update.title,
        description: texts.update.description,
        inputSchema: updateInputSchema,
        annotations: { idempotentHint: true },
      },
      (args, ctx) => byName[args.entity].update(args, { log: logger(ctx) }),
    )

    domain.registerExtraTools?.(server, logger)
  }
}
