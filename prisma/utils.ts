import type { z } from 'zod'

export function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error(
      `${label} invalide: ${result.error.issues[0]?.message ?? 'format invalide'}`,
    )
  }
  return result.data
}
