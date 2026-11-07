import { z } from "zod"

const SORT_KEYS = ["name", "createdAt", "updatedAt"] as const
const SORT_ORDERS = ["asc", "desc"] as const

type SortKey = (typeof SORT_KEYS)[number]
type SortOrder = (typeof SORT_ORDERS)[number]

export const pageQueryShape = {
  sort: z.enum(SORT_KEYS).default("name").describe("Sort key. Defaults to name."),
  order: z.enum(SORT_ORDERS).default("asc").describe("Sort direction. Defaults to asc."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Page size, 1 to 100. Defaults to 20."),
  offset: z.number().int().min(0).default(0).describe("Number of rows to skip. Defaults to 0."),
} as const

type PersonOrderBy =
  | { person: { name: SortOrder } }
  | { createdAt: SortOrder }
  | { updatedAt: SortOrder }
  | { personId: "asc" }

// Le nom vit sur la personne. L'id départage les ex æquo : sans lui, deux pages pourraient se recouper.
export function personOrderBy(sort: SortKey, order: SortOrder): PersonOrderBy[] {
  const bySort = {
    name: { person: { name: order } },
    createdAt: { createdAt: order },
    updatedAt: { updatedAt: order },
  } satisfies Record<SortKey, PersonOrderBy>
  return [bySort[sort], { personId: "asc" }]
}
