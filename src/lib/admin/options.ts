export function withCurrentOption<T extends { id: string }>(
  options: readonly T[],
  current: T | null | undefined,
): readonly T[] {
  if (!current || options.some((option) => option.id === current.id)) return options
  return [current, ...options]
}
