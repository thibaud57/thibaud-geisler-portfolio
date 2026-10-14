export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function knownId(
  requested: string | undefined,
  options: readonly { id: string }[],
): string | undefined {
  return options.some((option) => option.id === requested) ? requested : undefined
}
