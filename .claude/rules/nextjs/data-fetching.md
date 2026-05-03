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
- Appeler `await connection()` dans les Server Components async qui appellent des queries Prisma, **y compris quand celles-ci sont wrappées dans `'use cache'`**, dans notre contexte build Docker BuildKit + Dokploy (cf. Gotcha "Build Docker BuildKit" ci-dessous). Le `connection()` force la zone dynamic et empêche le prerender d'évaluer la query au build (sandbox BuildKit isolé du réseau, DB Dokploy non joignable). Couplé à `'use cache'`, on conserve le Data Cache au runtime
- `await cookies()`, `await headers()`, `await draftMode()` : ces APIs sont async (hard error en Next 16 si sync)
- Utiliser `after(callback)` importé depuis `next/server` pour logging/analytics non bloquants après la réponse
- Exporter une fonction `preload()` qui kick off le fetch en amont pour éviter les waterfalls parent/enfant
- Wrapper les queries Prisma avec `'use cache'` (Next 16) pour les faire participer au Data Cache
- Ajouter `import 'server-only'` en haut de tout module qui accède à Prisma (garde-fou build-time : erreur si le module est importé dans un Client Component). Installer le package : `pnpm add server-only`

## À éviter
- Enchaîner deux `await` indépendants l'un après l'autre dans un même composant (waterfall accidentel) : paralléliser avec `Promise.all()`
- Utiliser `unstable_noStore()` : **déprécié** Next 15, utiliser `connection()` à la place
- Appeler `cookies()` ou `headers()` dans un callback `after()` : runtime error, lire les valeurs avant et les passer en paramètre
- Compter sur le Data Cache automatique pour les queries Prisma : elles ne participent pas, wrap explicite avec `'use cache'` ou `cache()` React
- Créer une Promise dans le corps du render et la passer à `use()` : boucle infinie de suspension, la Promise doit venir d'un parent Server Component

## Gotchas
- Next 15 breaking : `fetch()` n'est **plus** caché par défaut, chaque appel est `no-store` sauf opt-in explicite via `cache: 'force-cache'` ou `'use cache'` (Next 16)
- **Build Docker BuildKit + Dokploy : `await connection()` reste nécessaire avec `'use cache'` sur queries Prisma**. Sans `connection()`, Next prerender la zone au build et exécute `'use cache'` pour cacher le résultat → query Prisma → ECONNREFUSED car BuildKit isole le sandbox du réseau Docker ([moby/buildkit#978](https://github.com/moby/buildkit/issues/978), valable en local `docker compose build` et sur Dokploy). Pattern projet : `'use cache'` sur queries (`src/server/queries/**`) + `await connection()` dans chaque composant async DB-bound (sous `<Suspense>`) — les **deux ensemble**, vérifié expérimentalement (test : retirer un seul `connection()` → crash de la page concernée). La règle "redondant" tient uniquement quand la DB est joignable au build (CI avec Postgres temporaire, plateformes avec accès DB build-time)
- Prisma 7 + Next 16 `cacheComponents: true` : le `new Date()` interne Prisma 7 peut déclencher l'erreur *"used new Date() before accessing uncached data"* dans les composants qui lisent Prisma sans cache. `await connection()` couvre aussi ce cas (voir [issue Prisma #28588](https://github.com/prisma/prisma/issues/28588))
- `cache()` React est per-request uniquement (détruit à la fin du render), **pas** le Data Cache persistant : portée limitée à la requête courante, aucun partage entre utilisateurs
- **`cache()` React et `'use cache'` Next 16 opèrent dans des scopes isolés, pas complémentaires** : superposer les 2 sur la même fonction est redondant (les valeurs stockées via `cache()` hors d'un scope `'use cache'` ne sont pas visibles dedans). Préférer `'use cache'` seul (Data Cache persistant + dedup per-request automatique) dès que `cacheComponents: true`. Garder `cache()` uniquement pour les fonctions qui ne passent pas par le Data Cache (ex: utilitaire pur sans fetch ni query DB, appelé plusieurs fois dans le même render)
- Activer `logging: { fetches: { fullUrl: true } }` dans `next.config.ts` pour tracer les waterfalls et débugger les HIT/MISS en dev

## Exemples
```typescript
// ✅ Parallel fetching avec Promise.all (évite waterfall)
// connection() requis ici car getA/getB lisent Prisma SANS 'use cache' (dynamic runtime)
async function Page() {
  await connection()
  const [a, b] = await Promise.all([getA(), getB()])
  return <View a={a} b={b} />
}

// ✅ Pattern cacheComponents + 'use cache' : pas de connection() nécessaire
async function Page() {
  const data = await getCachedData() // 'use cache' en interne → scope cache absorbe new Date() Prisma
  return <View data={data} />
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
