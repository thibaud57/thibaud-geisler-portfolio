export function assertNever(value: never): never {
  throw new Error(`Cas non traité : ${JSON.stringify(value)}`)
}
