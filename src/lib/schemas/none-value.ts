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
