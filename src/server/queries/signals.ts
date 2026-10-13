import "server-only"

import type { Prisma } from "@/generated/prisma/client"

export const signalsInclude = {
  select: {
    id: true,
    type: true,
    occurredOn: true,
    content: true,
    sourceUrl: true,
  },
  orderBy: [{ occurredOn: "desc" }, { id: "asc" }],
} satisfies Prisma.SignalFindManyArgs
