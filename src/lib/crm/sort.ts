// Date absente en dernier dans les deux sens : une ligne sans date n'est ni la plus récente ni la plus ancienne.
export function nullsLastBy<T>(pick: (row: T) => Date | null, direction: 1 | -1) {
  return (a: T, b: T): number => {
    const dateA = pick(a)
    const dateB = pick(b)
    if (!dateA || !dateB) return dateA ? -1 : dateB ? 1 : 0
    return direction * (dateA.getTime() - dateB.getTime())
  }
}
