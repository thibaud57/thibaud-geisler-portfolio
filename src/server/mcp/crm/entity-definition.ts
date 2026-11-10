import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { z } from "zod"

import type { McpLogger } from "@/server/mcp/logger"

import { toolError, toolJson } from "./results"

export interface SearchHit<E extends string = string> {
  entity: E
  id: string
  label: string
  hint: string
  // Personne opposée à la prospection : l'agent sait qu'il ne doit pas la recréer
  optedOut?: true
}

export const joinHint = (...parts: readonly (string | null | undefined)[]): string =>
  parts.filter((part) => part !== null && part !== undefined && part !== "").join(" · ")

export interface CrmWriteContext {
  log: McpLogger
}

// Fragments de la description des outils `crm_*`, assemblés par `tools.ts` dans l'ordre du registre : une entité ajoutée ne touche pas les outils.
export interface CrmToolDocs {
  readonly search?: string
  readonly fetch?: string
  readonly queryRow?: string
  readonly querySort?: string
  readonly create?: string
  readonly update?: string
}

// Méthodes plutôt que propriétés fonction : une entité à schémas plus précis reste assignable à `RegisteredCrmEntity`
interface CrmEntityDefinition<
  E extends string,
  TQuery extends z.ZodObject,
  TCreate extends z.ZodObject,
  TUpdate extends z.ZodObject,
> {
  entity: E
  docs: CrmToolDocs
  search(query: string): Promise<readonly SearchHit<E>[]>
  fetch(id: string): Promise<object | null>
  querySchema: TQuery
  query(params: z.output<TQuery>): Promise<{ rows: readonly object[]; total: number }>
  createSchema: TCreate
  create(input: z.output<TCreate>, ctx: CrmWriteContext): Promise<CallToolResult>
  updateSchema: TUpdate
  update(input: z.output<TUpdate>, ctx: CrmWriteContext): Promise<CallToolResult>
}

export interface RegisteredCrmEntity<E extends string> {
  entity: E
  docs: CrmToolDocs
  querySchema: z.ZodObject
  createSchema: z.ZodObject
  updateSchema: z.ZodObject
  search(query: string): Promise<readonly SearchHit<E>[]>
  fetch(id: string): Promise<object | null>
  query(args: unknown): Promise<CallToolResult>
  create(args: unknown, ctx: CrmWriteContext): Promise<CallToolResult>
  update(args: unknown, ctx: CrmWriteContext): Promise<CallToolResult>
}

// Seul parse de la partie propre à l'entité (`data`, `fields`, `filters`), que le SDK laisse passer brut (`z.looseObject({})` à la racine de l'`inputSchema`) : il rend le type de sortie du schéma sans cast, `Date` des codecs comprises.
// Les champs racine (`entity`, `id`, `sort`, `order`, `limit`, `offset`) sont parsés une seconde fois ici après le SDK : leurs schémas restent idempotents, sans codec ni transform.
function parsedWith<S extends z.ZodType, Rest extends unknown[]>(
  schema: S,
  run: (data: z.output<S>, ...rest: Rest) => Promise<CallToolResult>,
) {
  return async (args: unknown, ...rest: Rest): Promise<CallToolResult> => {
    const parsed = schema.safeParse(args)
    return parsed.success ? run(parsed.data, ...rest) : toolError(z.prettifyError(parsed.error))
  }
}

export function defineCrmEntity<
  E extends string,
  TQuery extends z.ZodObject,
  TCreate extends z.ZodObject,
  TUpdate extends z.ZodObject,
>(definition: CrmEntityDefinition<E, TQuery, TCreate, TUpdate>): RegisteredCrmEntity<E> {
  return {
    ...definition,
    query: parsedWith(definition.querySchema, async (params) =>
      toolJson(await definition.query(params)),
    ),
    create: parsedWith(definition.createSchema, (input, ctx: CrmWriteContext) =>
      definition.create(input, ctx),
    ),
    update: parsedWith(definition.updateSchema, (input, ctx: CrmWriteContext) =>
      definition.update(input, ctx),
    ),
  }
}
