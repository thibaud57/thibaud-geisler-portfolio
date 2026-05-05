import 'server-only'

import { connection } from 'next/server'

// Workaround : DB inaccessible au build Docker BuildKit/Dokploy (issue Dokploy #2413).
// Force dynamic au build pour bypass le fill 'use cache' (ECONNREFUSED sinon).
// No-op au runtime, sinon Activity boundaries → HierarchyRequestError au reveal Suspense.
// TODO retirer quand Dokploy expose la DB au build (#2413).
export async function buildOnlyConnection(): Promise<void> {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    await connection()
  }
}
