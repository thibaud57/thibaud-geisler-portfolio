---
paths:
  - "src/server/queries/**/*.ts"
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
---

# Next.js — Data Fetching (Server Components)

## À faire
- Faire les queries DB/API directement dans les Server Components `async`, pas de layer API intermédiaire
- Utiliser `Promise.all()` pour paralléliser les fetches indépendants (éviter les waterfalls sur TTFB)
- Wrapper les fonctions custom (Prisma, appels SDK) avec `cache()` de React pour la mémoïsation per-request
- Placer un `<Suspense fallback={...}>` autour des zones async lentes pour streamer les parties rapides sans attendre les lentes
- Appeler **`await buildOnlyConnection()`** (helper projet, voir `src/lib/build-only-connection.ts`) **en première ligne de chaque Server Component async wrappé sous `<Suspense>` qui appelle des queries `'use cache'`**. C'est un workaround **build-only conditionnel** (gaté sur `process.env.SKIP_ENV_VALIDATION === 'true'`, var setée par le Dockerfile uniquement au stage `builder`) qui force la zone dynamic uniquement pendant `next build` (pour empêcher Next de remplir le Data Cache au build → ECONNREFUSED Dokploy/BuildKit, cf. Gotcha ci-dessous), et ne fait **rien au runtime** (pour éviter les Activity boundaries `<!--$~-->` qui causent des `HierarchyRequestError` au reveal côté client sur les pages denses)
- `await cookies()`, `await headers()`, `await draftMode()` : ces APIs sont async (hard error en Next 16 si sync)
- Utiliser `after(callback)` importé depuis `next/server` pour logging/analytics non bloquants après la réponse
- Exporter une fonction `preload()` qui kick off le fetch en amont pour éviter les waterfalls parent/enfant
- Wrapper les queries Prisma avec `'use cache'` (Next 16) pour les faire participer au Data Cache
- Ajouter `import 'server-only'` en haut de tout module qui accède à Prisma (garde-fou build-time : erreur si le module est importé dans un Client Component). Installer le package : `pnpm add server-only`

## À éviter
- Enchaîner deux `await` indépendants l'un après l'autre dans un même composant (waterfall accidentel) : paralléliser avec `Promise.all()`
- Utiliser `unstable_noStore()` : **déprécié** Next 15, utiliser `connection()` à la place
- Appeler **`await connection()` directement** dans un Server Component sous `<Suspense>` qui contient des queries `'use cache'` : cumulé au runtime, ça crée des Activity boundaries `<!--$~-->` qui causent des `HierarchyRequestError` au reveal sur les pages denses (multi-Suspense). Utiliser le helper conditionnel `buildOnlyConnection()` à la place
- Appeler `cookies()` ou `headers()` dans un callback `after()` : runtime error, lire les valeurs avant et les passer en paramètre
- Compter sur le Data Cache automatique pour les queries Prisma : elles ne participent pas, wrap explicite avec `'use cache'` ou `cache()` React
- Créer une Promise dans le corps du render et la passer à `use()` : boucle infinie de suspension, la Promise doit venir d'un parent Server Component

## Gotchas
- Next 15 breaking : `fetch()` n'est **plus** caché par défaut, chaque appel est `no-store` sauf opt-in explicite via `cache: 'force-cache'` ou `'use cache'` (Next 16)
- **Build Docker BuildKit + Dokploy : DB non accessible au build**. BuildKit isole le sandbox réseau, donc les queries Prisma `'use cache'` que Next tente de remplir au build throw `ECONNREFUSED` ([moby/buildkit#978](https://github.com/moby/buildkit/issues/978), [Dokploy/dokploy#2413](https://github.com/Dokploy/dokploy/issues/2413)). Solution : `await buildOnlyConnection()` au top de chaque composant async sous `<Suspense>` (force la zone dynamic au build via `process.env.SKIP_ENV_VALIDATION === 'true'`, var setée explicitement dans le stage `builder` du Dockerfile, absente au runtime). Pas de pattern globalisable côté layout/page parent : Next prerender chaque `<Suspense>` enfant indépendamment du parent. **`process.env.NEXT_PHASE` testé mais inadapté** : reste à `'phase-production-build'` aussi au runtime `next start`, donc helper devient actif au runtime → race condition PPR retombe
- **`await connection()` brut au runtime + multi-Suspense + `cacheComponents: true` = bug** : crée des Activity boundaries (`<!--$~-->`) au runtime, qui en cascade au reveal côté client peuvent throw `HierarchyRequestError: The new child element contains the parent`. Toujours passer par `buildOnlyConnection()` (conditionnel) plutôt que `connection()` direct
- Prisma 7 + Next 16 `cacheComponents: true` : le `new Date()` interne Prisma 7 peut déclencher l'erreur *"used new Date() before accessing uncached data"* dans les composants qui lisent Prisma sans cache. La query wrappée `'use cache'` absorbe ce cas dans son scope cache (voir [issue Prisma #28588](https://github.com/prisma/prisma/issues/28588))
- `cache()` React est per-request uniquement (détruit à la fin du render), **pas** le Data Cache persistant : portée limitée à la requête courante, aucun partage entre utilisateurs
- **`cache()` React et `'use cache'` Next 16 opèrent dans des scopes isolés, pas complémentaires** : superposer les 2 sur la même fonction est redondant (les valeurs stockées via `cache()` hors d'un scope `'use cache'` ne sont pas visibles dedans). Préférer `'use cache'` seul (Data Cache persistant + dedup per-request automatique) dès que `cacheComponents: true`. Garder `cache()` uniquement pour les fonctions qui ne passent pas par le Data Cache (ex: utilitaire pur sans fetch ni query DB, appelé plusieurs fois dans le même render)
- Activer `logging: { fetches: { fullUrl: true } }` dans `next.config.ts` pour tracer les waterfalls et débugger les HIT/MISS en dev

## Exemples
```typescript
// ✅ Pattern projet : buildOnlyConnection() conditionnel au top des Server Components
// async sous <Suspense> qui appellent des queries 'use cache'
import { buildOnlyConnection } from '@/lib/build-only-connection'

async function StatsAsync() {
  await buildOnlyConnection() // build-only : empêche fill cache → no ECONNREFUSED. Runtime : no-op
  const [years, missions] = await Promise.all([
    getYearsOfExperience(), // 'use cache' interne
    countMissionsDelivered(),
  ])
  return <NumberTickerStats stats={[years, missions]} />
}

// ❌ Anti-pattern : await connection() direct → bug PPR Activity boundaries au runtime
async function StatsAsync() {
  await connection() // ⚠️ crée <!--$~--> qui peut throw HierarchyRequestError au reveal
  // ...
}
```

```typescript
// ✅ Parallel fetching avec Promise.all (évite waterfall)
async function Page() {
  const [a, b] = await Promise.all([getA(), getB()]) // 'use cache' chacune
  return <View a={a} b={b} />
}

// ❌ Waterfall accidentel : fetchs séquentiels alors qu'indépendants
async function Page() {
  const a = await getA()
  const b = await getB() // attend a inutilement
  return <View a={a} b={b} />
}
```

```typescript
// ✅ Memoization per-request avec cache() React + server-only (queries Prisma)
import 'server-only'
import { cache } from 'react'

export const getItem = cache(async (id: string) => { ... })
// Composant A et B qui appellent getItem("x") → une seule query DB
```

```typescript
// ✅ after() pour logging non bloquant après la réponse
async function Page() {
  const data = await getData()
  after(() => log(data.id))
  return <View data={data} />
}

// ❌ cookies() ou headers() dans le callback after() → runtime error
after(async () => {
  const session = await cookies() // erreur, lire AVANT after()
})
```
