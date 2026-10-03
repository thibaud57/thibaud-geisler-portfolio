---
paths:
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
  - "src/server/**/*.ts"
---

# Next.js — Rendering & Caching

## À faire
- Garder **`cacheComponents: true`** dans `next.config.ts` : prérequis de `'use cache'` et du Partial Prerendering stable en Next 16
- Lire le rapport `next build` par route (`○ Static`, `ƒ Dynamic`, `◐ Partial Prerender`) pour repérer un rendu inattendu
- Opter explicitement pour le cache : depuis Next 15, `fetch()` est `no-store` par défaut, et les queries Prisma n'entrent dans le cache que sous `'use cache'`
- Placer `'use cache'` au niveau fichier, composant ou fonction selon la granularité souhaitée
- Définir `cacheLife('hours')`, `cacheLife('days')` ou un profil custom pour contrôler stale/revalidate/expire
- Poser `cacheTag('tag-1', 'tag-2')` pour une invalidation ciblée depuis les Server Actions
- Invalider par `revalidateTag(tag, 'max')` pour la cohérence à terme (visiteurs suivants), `updateTag(tag)` pour read-your-writes (l'auteur)
- Importer `cacheLife`, `cacheTag` et `io` depuis `next/cache` sans préfixe `unstable_` : stables en Next 16
- Ne pas prérendre les slugs par `generateStaticParams` : le build ne lit jamais la base ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md)). `generateStaticParams` ne sert qu'aux locales du layout racine
- Activer `logging: { fetches: { fullUrl: true } }` dans `next.config.ts` pour tracer HIT/MISS en dev

## À éviter
- Mixer `cacheComponents: true` avec `export const dynamic` ou `export const dynamicParams` : **incompatibles**, le build échoue (vérifié sur Next 16.3.3)
- Stocker des données propres à un utilisateur dans un scope `'use cache'` partagé sans variante `private` : cache poisoning entre utilisateurs
- Laisser le Router Cache à ses valeurs par défaut sans en mesurer l'impact : Next 15 a supprimé le `staleTime` par défaut des segments dynamiques
- `revalidateTag(tag)` avec un seul argument : signature dépréciée en Next 16

## Gotchas
- **`'use cache'` XOR `<Suspense>`** : un Server Component async est SOIT entièrement cacheable (inclus dans le shell statique au prerender) SOIT sous `<Suspense>` (rendu à la requête). Exception, le motif de tout le site public : un composant sous `<Suspense>` qui s'ouvre par `await io()` puis appelle une fonction `'use cache'`. Il est exclu du prerender, la fonction se met en cache à la requête, et la base n'est jamais lue au build
- Avec `cacheComponents: true`, un accès à des données dynamiques sans `<Suspense>` ni `'use cache'` déclenche « Uncached data was accessed outside of `<Suspense>` »
- Les dynamic functions (`cookies()`, `headers()`, `searchParams`, `connection()`) imposent un `<Suspense>` parent et sont interdites sous `'use cache'`
- Préférer `io()` (Next 16.3.0) à `connection()` dans les composants : il suspend comme un `await` ordinaire et laisse le code aval se mettre en cache. `connection()` + plusieurs `<Suspense>` + `cacheComponents` déclenche une HierarchyRequestError au reveal sur les pages denses ([vercel/next.js#86577](https://github.com/vercel/next.js/issues/86577)), il reste réservé aux route handlers sans arbre React (`sitemap.ts`, `llms.txt`)
- APIs retirées en Next 15/16 : `unstable_cache` (→ `'use cache'`), `experimental.ppr` et `experimental.dynamicIO` (→ `cacheComponents`), `export const experimental_ppr`, `unstable_noStore()` (→ `connection()` ou `io()`)
- `'use cache: private'` (expérimental) autorise `cookies()`/`headers()` dans le scope, résultat caché dans le seul navigateur. N'autorise PAS `connection()`

## Exemples
```typescript
// ✅ Query cachée, appelée après io() sous Suspense
async function getResource(slug: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(`resource-${slug}`, 'resources')
  return prisma.resource.findUnique({ where: { slug } })
}

// ❌ generateStaticParams qui lit la base : le build en dépendrait
export async function generateStaticParams() {
  return (await prisma.resource.findMany()).map((r) => ({ slug: r.slug }))
}
```
