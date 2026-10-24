export function keysOf<R extends object>(record: R): (keyof R & string)[] {
  // Object.keys type ses clés en string : le cast restitue les clés de R, que `record` énumère.
  return Object.keys(record) as (keyof R & string)[]
}
