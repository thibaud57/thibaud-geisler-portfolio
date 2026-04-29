import nextEnv from '@next/env'

process.env.SKIP_ENV_VALIDATION = 'true'
nextEnv.loadEnvConfig(process.cwd())

// Valeur fixe pour les assertions SEO (canonical, openGraph.url, languages alternates) :
// override systématique du .env dev (qui pointe sur localhost) afin que `@/env` retourne
// une URL stable, et que `seo.test.ts` puisse retirer `vi.mock('@/env')` (fragile sous
// Vitest 4 + projects, cf. vitest#6258).
process.env.NEXT_PUBLIC_SITE_URL = 'https://thibaud-geisler.com'
