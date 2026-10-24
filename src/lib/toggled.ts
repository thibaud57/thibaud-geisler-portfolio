export function toggled<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  return new Set(set.has(value) ? [...set].filter((member) => member !== value) : [...set, value])
}
