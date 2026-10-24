export function recordFromKeys<K extends string, V>(
  keys: readonly K[],
  value: (key: K) => V,
): Record<K, V> {
  // Object.fromEntries type ses clés en string : le cast restitue l'union K, que `keys` énumère.
  return Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, V>
}
