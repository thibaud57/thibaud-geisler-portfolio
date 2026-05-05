---
paths:
  - "src/server/queries/**/*.ts"
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
---

# Next.js — Data Fetching (Server Components)

## À faire
- Faire les queries DB/API directement dans les Server Components `async`, pas de layer API intermédiaire
- Wrapper toute query DB/API avec **`'use cache'`** (Next 16 stable, requiert `cacheComponents: true`) + `cacheLife()` + `cacheTag()` pour participer au Data Cache et être inclus dans le static shell au prerender
- Utiliser `Promise.all()` pour paralléliser les fetches indépendants (éviter waterfalls TTFB)
- Pour les routes dynamiques `/[slug]`, exporter **`generateStaticParams`** qui retourne tous les slugs publics au build → tous prerendered en `◐ Partial Prerender`. **Requiert que la DB soit accessible au build** (sinon `EmptyGenerateStaticParamsError`)
- `await cookies()`, `await headers()`, `await draftMode()`, `await searchParams`, `await params` : APIs async, hard error si sync en Next 16
- Utiliser `after(callback)` importé depuis `next/server` pour logging/analytics non bloquants après la réponse
- Ajouter `import 'server-only'` en haut de tout module qui accède à Prisma (garde-fou : erreur si importé dans un Client Component)

## À éviter
- Enchaîner deux `await` indépendants l'un après l'autre (waterfall) : paralléliser avec `Promise.all()`
- Utiliser `unstable_noStore()` : déprécié, remplacé par `connection()` (mais voir gotcha bug R19.2 ci-dessous)
- Utiliser `cache()` de React sur les queries Prisma : redondant avec `'use cache'` (scopes isolés). Réserver `cache()` aux fonctions pures appelées plusieurs fois dans le même render sans IO
- Compter sur le Data Cache automatique pour les queries Prisma : elles ne participent pas au cache `fetch()`, wrap explicite obligatoire avec `'use cache'`
- **Wrapper un Server Component async dans `<Suspense>` quand toutes ses queries sont déjà en `'use cache'`** : redondant et ajoute une frontière inutile dans le shell statique (cf. règle XOR ci-dessous)
- Appeler `cookies()` ou `headers()` dans un callback `after()` : runtime error, lire les valeurs avant et les passer en paramètre
- Créer une Promise dans le corps du render et la passer à `use()` : boucle infinie, la Promise doit venir d'un parent

## Gotchas
- **`'use cache'` XOR `<Suspense>` (règle binaire Next 16, doc officielle)** : un Server Component async doit être SOIT entièrement cacheable via `'use cache'` (inclus dans le static shell au prerender) SOIT sous `<Suspense>` (streamed runtime). Jamais les deux. `<Suspense>` n'est obligatoire QUE pour les composants qui accèdent à `cookies()`/`headers()`/`searchParams`/`connection()` ou font des fetches non cachés. Exception : Client Components avec hooks runtime (`usePathname`, `useLocale`) rendus dans le root layout (Navbar/Footer) — ces zones exigent quand même un Suspense parent (validé empiriquement par erreur de build "Uncached data accessed outside of `<Suspense>`")
- **Build Docker BuildKit + Dokploy : DB inaccessible au build**. BuildKit isole le sandbox réseau, donc les queries Prisma `'use cache'` que Next tente d'exécuter au prerender throw `ECONNREFUSED` ([moby/buildkit#978](https://github.com/moby/buildkit/issues/978), [Dokploy/dokploy#2413](https://github.com/Dokploy/dokploy/issues/2413)). **Solution structurelle : externaliser le build via GitHub Actions avec service Postgres ephemeral + push GHCR + Dokploy en mode pull-only** (provider Docker, pas Git). Cf. doc Dokploy ["Going Production"](https://docs.dokploy.com/docs/core/applications/going-production) qui recommande explicitement ce pattern
- **`connection()` runtime + multi-Suspense + `cacheComponents: true` = bug HierarchyRequestError** au reveal côté client sur pages denses (≥7 markers `$?` ou Client Components hydratant lourds). Cause : interaction Activity wrap Next 16 + multi-Suspense streamées (issue [vercel/next.js#86577](https://github.com/vercel/next.js/issues/86577) Open). Mitigation : ne PAS utiliser `connection()` runtime, préférer le pattern `'use cache'` qui n'introduit pas de zone dynamique streamée
- Prisma 7 + Next 16 `cacheComponents: true` : `new Date()` interne Prisma 7 peut déclencher *"used new Date() before accessing uncached data"* dans les composants qui lisent Prisma sans cache. La query wrappée `'use cache'` absorbe ce cas dans son scope cache ([prisma#28588](https://github.com/prisma/prisma/issues/28588))
- `cache()` React et `'use cache'` Next 16 opèrent dans des scopes isolés : superposer les 2 sur la même fonction est redondant. Préférer `'use cache'` seul (Data Cache persistant + dedup per-request automatique) dès que `cacheComponents: true`
- Activer `logging: { fetches: { fullUrl: true } }` dans `next.config.ts` pour tracer waterfalls et débugger HIT/MISS en dev

## Exemples
```typescript
// ✅ Pattern Next 16 moderne : 'use cache' sur la query, pas de Suspense autour du composant
import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'

export async function getYearsOfExperience() {
  'use cache'
  cacheLife('days')
  cacheTag('about-stats')
  return prisma.experience.aggregate({ _max: { startedAt: true } })
}

// Page : pas de Suspense autour, le composant est inclus dans le static shell
async function StatsAsync() {
  const [years, missions] = await Promise.all([
    getYearsOfExperience(),
    countMissionsDelivered(),
  ])
  return <NumberTickerStats stats={[years, missions]} />
}

export default function Page() {
  return <StatsAsync /> // ✅ pas de <Suspense> nécessaire
}
```

```typescript
// ✅ Suspense obligatoire UNIQUEMENT pour les zones qui lisent runtime APIs
async function ContactTabsAsync({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams // ← runtime API → exige Suspense parent
  return <ContactTabs prefill={service} />
}

export default function Page({ searchParams }) {
  return (
    <Suspense fallback={null}>
      <ContactTabsAsync searchParams={searchParams} />
    </Suspense>
  )
}
```

```typescript
// ✅ generateStaticParams pour routes dynamiques /[slug]
// Requiert DB accessible au build (CI GHA avec service Postgres ephemeral)
export async function generateStaticParams() {
  const slugs = await findAllPublishedSlugs() // 'use cache' interne
  return slugs.map(({ slug }) => ({ slug }))
}

export default async function Page({ params }) {
  const { slug } = await params
  const project = await findPublishedBySlug(slug) // 'use cache' interne
  return <CaseStudy project={project} />
}
```

```typescript
// ✅ Parallel fetching avec Promise.all (évite waterfall)
const [a, b] = await Promise.all([getA(), getB()]) // 'use cache' chacune

// ❌ Waterfall accidentel
const a = await getA()
const b = await getB() // attend a inutilement
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
