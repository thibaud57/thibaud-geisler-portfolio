import { config } from 'dotenv'

// Doit s'exécuter avant toute résolution de `@/lib/prisma` par les tests :
// l'hoisting des `import` ES modules empêche un `dotenv.config()` en tête de fichier
// de prendre effet avant l'instanciation du singleton PrismaClient.
config({ path: '.env.test', override: true })
