const TEST_SUFFIX = "_test"

export interface TestDatabase {
  readonly name: string
  readonly url: string
  readonly adminUrl: string
}

// Le garde-fou qui tient quand la config se trompe : tout DROP ou TRUNCATE passe par lui.
export function assertTestDatabase(name: string): void {
  if (!name.endsWith(TEST_SUFFIX)) {
    throw new Error(
      `Base "${name}" refusée : seule une base finissant par "${TEST_SUFFIX}" est touchée`,
    )
  }
}

// `adminUrl` vise la base de maintenance du même serveur : on ne supprime pas la base à laquelle on est connecté.
export function deriveTestDatabase(devUrl: string): TestDatabase {
  const url = new URL(devUrl)
  const devName = decodeURIComponent(url.pathname.slice(1))
  if (devName === "") throw new Error("DATABASE_URL ne nomme aucune base")

  const name = `${devName}${TEST_SUFFIX}`
  const withDatabase = (database: string) => {
    const copy = new URL(url)
    copy.pathname = `/${encodeURIComponent(database)}`
    return copy.toString()
  }
  return { name, url: withDatabase(name), adminUrl: withDatabase("postgres") }
}
