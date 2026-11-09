import { z } from "zod"

const SORT_KEYS = ["name", "createdAt", "updatedAt"] as const
const SORT_ORDERS = ["asc", "desc"] as const

export type SortKey = (typeof SORT_KEYS)[number]
export type SortOrder = (typeof SORT_ORDERS)[number]

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

// Le tri « name » dépend de l'entité : l'appelant donne son ordre. L'id départage les ex æquo : sans lui, deux pages pourraient se recouper.
export function pageOrderBy<TName extends object, const TTiebreak extends object>(
  sort: SortKey,
  order: SortOrder,
  byName: (order: SortOrder) => readonly TName[],
  tiebreak: TTiebreak,
): (TName | TTiebreak | { createdAt: SortOrder } | { updatedAt: SortOrder })[] {
  const bySort = {
    name: byName(order),
    createdAt: [{ createdAt: order }],
    updatedAt: [{ updatedAt: order }],
  } satisfies Record<SortKey, readonly object[]>
  return [...bySort[sort], tiebreak]
}

export const idOrderBy = <TName extends object>(
  sort: SortKey,
  order: SortOrder,
  byName: (order: SortOrder) => readonly TName[],
) => pageOrderBy(sort, order, byName, { id: "asc" })

// Le nom vit sur la personne.
export const personOrderBy = (sort: SortKey, order: SortOrder) =>
  pageOrderBy(sort, order, (direction) => [{ person: { name: direction } }], {
    personId: "asc",
  })
