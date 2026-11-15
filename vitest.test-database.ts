import { inject } from "vitest"

// Après vitest.env-loader.ts : `@next/env` pose DATABASE_URL s'il est absent, cette ligne a le dernier mot.
process.env["DATABASE_URL"] = inject("testDatabaseUrl")
