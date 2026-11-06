import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { z } from "zod"

import type { McpLogger } from "@/server/mcp/logger"

import { toolError, toolJson } from "./results"

export interface SearchHit<E extends string = string> {
  entity: E
  id: string
  label: string
  hint: string | null
}

export interface CrmWriteContext {
  log: McpLogger
}

// Méthodes plutôt que propriétés fonction : une entité à schémas plus précis reste assignable à `RegisteredCrmEntity`
export interface CrmEntityDefinition<
  E extends string,
  TQuery extends z.ZodObject,
  TCreate extends z.ZodObject,
  TUpdate extends z.ZodObject,
> {
  entity: E
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
  querySchema: z.ZodObject
  createSchema: z.ZodObject
  updateSchema: z.ZodObject
  search(query: string): Promise<readonly SearchHit<E>[]>
  fetch(id: string): Promise<object | null>
  query(args: unknown): Promise<CallToolResult>
  create(args: unknown, ctx: CrmWriteContext): Promise<CallToolResult>
  update(args: unknown, ctx: CrmWriteContext): Promise<CallToolResult>
}

// Le SDK a déjà validé l'entrée : le reparse ici fixe le type de sortie du schéma sans cast, d'où des schémas idempotents.
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
