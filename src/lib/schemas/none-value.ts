import { z } from "zod"

// Un SelectItem Radix refuse value="" : un Select nullable rend un sentinel comme premier
// item, retraduit en null par cette fonction. Les deux génériques (T pour la valeur, S pour le
// sentinel) préservent le littéral d'enum de la branche non sentinelle : un helper non générique
// aurait élargi le type de sortie en `string | null` et fait perdre l'inférence Prisma côté appelant.
export function nullifyNoneValue<T extends string, S extends string>(
  value: T,
  sentinel: S,
): Exclude<T, S | ""> | null {
  return (value as string) === sentinel || value === "" ? null : (value as Exclude<T, S | "">)
}

export const emptyToNull = (value: string) => (value === "" ? null : value)

// Sentinelle « Non renseigné » des Select nullables (un SelectItem Radix refuse value="").
export const NONE_VALUE = "aucune"

export const nullableEnumField = <T extends string>(values: readonly T[], error: string) =>
  z
    .union([z.enum(values), z.literal(NONE_VALUE), z.literal("")], { error })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE))
