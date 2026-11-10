export { cn } from "cn"

export const mapDefined = <T, U>(value: T | undefined, convert: (value: T) => U): U | undefined =>
  value === undefined ? undefined : convert(value)
