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

export interface WriteContext {
  log: McpLogger
}

// Fragments de description des outils, assemblés par `docsOf` : une entité ajoutée ne touche pas les outils.
export interface ToolDocs {
  readonly search?: string
  readonly fetch?: string
  readonly queryRow?: string
  readonly querySort?: string
  readonly create?: string
  readonly update?: string
}

// Méthodes plutôt que propriétés fonction : une entité à schémas plus précis reste assignable à `RegisteredEntity`
interface EntityDefinition<
  E extends string,
  TQuery extends z.ZodObject,
  TCreate extends z.ZodObject,
  TUpdate extends z.ZodObject,
> {
  entity: E
  docs: ToolDocs
  search(query: string): Promise<readonly SearchHit<E>[]>
  fetch(id: string): Promise<object | null>
  querySchema: TQuery
  query(params: z.output<TQuery>): Promise<{ rows: readonly object[]; total: number }>
  createSchema: TCreate
  create(input: z.output<TCreate>, ctx: WriteContext): Promise<CallToolResult>
  updateSchema: TUpdate
  update(input: z.output<TUpdate>, ctx: WriteContext): Promise<CallToolResult>
}

export interface RegisteredEntity<E extends string> {
  entity: E
  docs: ToolDocs
  querySchema: z.ZodObject
  createSchema: z.ZodObject
  updateSchema: z.ZodObject
  search(query: string): Promise<readonly SearchHit<E>[]>
  fetch(id: string): Promise<object | null>
  query(args: unknown): Promise<CallToolResult>
  create(args: unknown, ctx: WriteContext): Promise<CallToolResult>
  update(args: unknown, ctx: WriteContext): Promise<CallToolResult>
}

// Seul parse de la partie propre à l'entité, que le SDK laisse passer brut ; les champs racine, déjà parsés par le SDK, le sont une 2e fois (schémas idempotents).
function parsedWith<S extends z.ZodType, Rest extends unknown[]>(
  schema: S,
  run: (data: z.output<S>, ...rest: Rest) => Promise<CallToolResult>,
) {
  return async (args: unknown, ...rest: Rest): Promise<CallToolResult> => {
    const parsed = schema.safeParse(args)
    return parsed.success ? run(parsed.data, ...rest) : toolError(z.prettifyError(parsed.error))
  }
}

export function defineEntity<
  E extends string,
  TQuery extends z.ZodObject,
  TCreate extends z.ZodObject,
  TUpdate extends z.ZodObject,
>(definition: EntityDefinition<E, TQuery, TCreate, TUpdate>): RegisteredEntity<E> {
  return {
    ...definition,
    query: parsedWith(definition.querySchema, async (params) =>
      toolJson(await definition.query(params)),
    ),
    create: parsedWith(definition.createSchema, (input, ctx: WriteContext) =>
      definition.create(input, ctx),
    ),
    update: parsedWith(definition.updateSchema, (input, ctx: WriteContext) =>
      definition.update(input, ctx),
    ),
  }
}

// Chaque clé doit être le nom de son entité : une entité absente ou rangée sous un autre nom casse au typage.
export function entityTable<const T extends { [K in keyof T & string]: RegisteredEntity<K> }>(
  table: T,
): T {
  return table
}
