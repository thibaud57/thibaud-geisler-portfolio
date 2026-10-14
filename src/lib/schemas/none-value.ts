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

export const emptyToNull = <T>(value: T): T | null => (value === "" ? null : value)

export const NONE_VALUE = "aucune"

// Libellé de la sentinelle, accordé au nom du champ : « Non renseigné » (contrat, mode de travail, rythme), « Non renseignée » (localité, taille).
export const NONE_LABEL = "Non renseigné"
export const NONE_LABEL_FEMININE = "Non renseignée"

export const nullableEnumField = <T extends string>(values: readonly T[], error: string) =>
  z
    .union([z.enum(values), z.literal(NONE_VALUE), z.literal("")], { error })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE))
