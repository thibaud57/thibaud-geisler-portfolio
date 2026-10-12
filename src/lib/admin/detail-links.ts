export function detailHref<P extends string>(path: P, id: string): `${P}?detail=${string}` {
  return `${path}?detail=${id}`
}
