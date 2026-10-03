---
paths:
  - "src/server/queries/**/*.ts"
  - "src/app/**/{page,layout}.tsx"
---

# Next.js — Data Fetching (Server Components)

## À faire
- Faire les queries directement dans les Server Components `async`, sans couche API intermédiaire
- Lire la base du site public **sous `<Suspense>`, après `await io()`**, en appelant une query `'use cache'` + `cacheLife()` + `cacheTag()` de `src/server/queries/` : le composant sort du prerender, la query se met en cache à la requête ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md))
- Paralléliser les lectures indépendantes par `Promise.all()`, jamais deux `await` indépendants à la suite (waterfall)
- `await cookies()`, `await headers()`, `await draftMode()`, `await searchParams`, `await params` : APIs async, hard error si sync en Next 16
- Utiliser `after(callback)` de `next/server` pour le logging ou l'analytics non bloquants, en lisant `cookies()`/`headers()` **avant** : ils lèvent une erreur dans le callback
- Ouvrir tout module qui accède à Prisma par `import 'server-only'`

## À éviter
- Rendre une query `'use cache'` sans `io()` préalable dans le site public : le composant entrerait dans le shell statique et lirait la base au build
- Envelopper une query Prisma par `cache()` de React : redondant avec `'use cache'` (scopes isolés). Réserver `cache()` aux fonctions sans IO appelées plusieurs fois dans un rendu, et à la lecture de session par requête (`getCurrentUser()`, cf. `nextjs/auth.md`), qui lit `headers()`
- Compter sur le cache automatique pour les queries Prisma : elles ne participent pas au cache `fetch()`

## Gotchas
- **Le build ne lit jamais la base** : ni `generateStaticParams` sur des données, ni `'use cache'` au prerender, ni `DATABASE_URL` au build. C'est ce qui rend le build possible dans un sandbox BuildKit sans réseau ([moby/buildkit#978](https://github.com/moby/buildkit/issues/978)). Le build reste sur GHA (`deploy.yml`) pour d'autres raisons (`docs/PRODUCTION.md` § Déploiement)
- Les Client Components à hooks runtime (`usePathname`, `useLocale`) rendus dans le layout racine (Navbar, Footer) exigent un `<Suspense>` parent, sans quoi le build lève « Uncached data accessed outside of `<Suspense>` ». Règle XOR complète : `nextjs/rendering-caching.md`
- Prisma 7 + `cacheComponents` : le `new Date()` interne de Prisma peut déclencher « used new Date() before accessing uncached data » hors cache, la query `'use cache'` l'absorbe ([prisma#28588](https://github.com/prisma/prisma/issues/28588))
- « `"use cache"` cannot be used outside of App Router. Expected a WorkStore » a été vue une fois sur Next 16.3.3, avec un `generateStaticParams` appelant un helper `'use cache'`, non reproduite ensuite : perte de contexte `AsyncLocalStorage` sous Turbopack ([discussion #86978](https://github.com/vercel/next.js/discussions/86978)). Si elle revient, relancer, garder le log, ouvrir une issue chez Next

## Exemples
```typescript
// ✅ Motif du site public : Suspense, io(), puis query cachée
export default function Page({ params }: PageProps<'/[locale]/projets/[slug]'>) {
  return <Suspense fallback={<Skeleton />}><Content params={params} /></Suspense>
}

async function Content({ params }) {
  await io()
  const { locale, slug } = await params
  const project = await findPublishedBySlug(slug, locale) // 'use cache' interne
  return <CaseStudy project={project} />
}

// ❌ Query cachée rendue sans io() : lue au build
export default async function Page() {
  return <List items={await getItems()} />
}
```
