export function isOneOf<T extends string>(options: readonly T[], value: string): value is T {
  return options.some((option) => option === value)
}

// Radix n'émet que les valeurs rendues : une valeur hors options trahit un défaut de câblage, jamais une saisie.
export function requireOption<T extends string>(options: readonly T[], value: string): T {
  if (!isOneOf(options, value)) throw new Error(`Valeur de contrôle hors options : ${value}`)
  return value
}
