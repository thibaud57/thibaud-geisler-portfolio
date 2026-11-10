import { z } from "zod"

// Intervalle d'un filtre de dates, borné par un instant ou par un jour selon l'entité. Les bornes se comparent comme des dates : deux instants de décalages différents ne se rangent pas par chaîne.
export function dateRange(bound: z.ZodType<Date, string>) {
  return z
    .strictObject({
      from: bound.optional().describe("Lower bound, included. Omit it for no lower bound."),
      to: bound.optional().describe("Upper bound, included. Omit it for no upper bound."),
    })
    .superRefine(({ from, to }, ctx) => {
      if (from !== undefined && to !== undefined && from > to) {
        ctx.addIssue({
          code: "custom",
          path: ["from"],
          message: "from must not be after to: swap the bounds or drop one of them.",
        })
      }
    })
    .describe("Interval with both bounds included, each one optional.")
}
