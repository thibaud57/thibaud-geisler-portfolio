---
paths:
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
  - "src/server/**/*.ts"
---

# Next.js — Rendering & Caching

## À faire
- Activer **`cacheComponents: true`** dans `next.config.ts` (prérequis pour la directive `'use cache'` et le Partial Prerendering stable en Next 16)
- Analyser le rapport `next build` par route : `○ Static`, `ƒ Dynamic`, `● SSG`, pour détecter les rendus dynamiques inattendus
- Opt-in explicite au cache : depuis Next 15, `fetch()` est `no-store` par défaut, ajouter `cache: 'force-cache'` ou `'use cache'` (Next 16)
- Wrapper les queries Prisma/Drizzle avec `'use cache'` pour les faire participer au Data Cache (elles n'y participent pas automatiquement)
- Placer `'use cache'` au niveau fichier, composant ou fonction selon la granularité souhaitée
- Définir `cacheLife('hours')`, `cacheLife('days')` ou un profil custom pour contrôler stale/revalidate/expire
- Utiliser `cacheTag('tag-1', 'tag-2')` pour permettre l'invalidation ciblée depuis les Server Actions
- Utiliser `revalidateTag(tag, 'max')` pour l'eventual consistency (visiteurs suivants), `updateTag(tag)` pour read-your-writes (l'auteur immédiat)
- Importer `cacheLife` et `cacheTag` depuis `next/cache` sans le préfixe `unstable_` : stables en Next 16 (plus `unstable_cacheLife as cacheLife`)
- Utiliser `generateStaticParams` avec `dynamicParams = false` pour retourner 404 sur les slugs non pré-générés
- Activer `logging: { fetches: { fullUrl: true } }` dans `next.config.ts` pour débugger HIT/MISS en dev

## À éviter
- Mixer `cacheComponents: true` avec `export const dynamic` : **incompatibles**, utiliser `<Suspense>` + `'use cache'` à la place
- Utiliser `unstable_cache` : **déprécié** Next 16, remplacé par `'use cache'`
- Utiliser `experimental.ppr` ou `experimental.dynamicIO` : supprimés/renommés en Next 16, absorbés par `cacheComponents`
- Utiliser `export const experimental_ppr` route-level : **supprimé** Next 16
- Appeler `revalidateTag(tag)` avec un seul argument : signature dépréciée Next 16
- Stocker des données user-specific dans un scope `'use cache'` partagé sans variante `private` : cache poisoning entre utilisateurs
- Utiliser `unstable_noStore()` : **déprécié** Next 15, utiliser `connection()` à la place
- Laisser le Router Cache à ses valeurs par défaut sans comprendre l'impact : Next 15 a supprimé le `staleTime` par défaut pour les segments dynamiques

## Gotchas
- Avec `cacheComponents: true`, un composant qui accède à des données dynamiques sans `<Suspense>` ni `'use cache'` déclenche l'erreur `"Uncached data was accessed outside of <Suspense>"`
- Les dynamic functions (`cookies()`, `headers()`, `searchParams`, `connection()`) forcent le rendu dynamique de toute la route si non isolées dans un `<Suspense>`
- `revalidateTag(tag, 'max')` = recommandation par défaut pour la plupart des cas
- Next 15 breaking : `staleTimes` par défaut supprimé pour les segments dynamiques, configurer explicitement si besoin (`{ dynamic: 30, static: 180 }`)
- `'use cache: private'` (expérimental) autorise l'accès à `cookies()`/`headers()` dans le scope cache, résultat caché uniquement dans le navigateur (pas sur le serveur)

## Exemples
```typescript
// ✅ Query DB avec 'use cache' + cacheLife + cacheTag (stable Next 16)
import { cacheLife, cacheTag } from 'next/cache'

async function getResource(slug: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(`resource-${slug}`, 'resources')
  return db.resource.findUnique({ where: { slug } })
}

// ❌ unstable_cacheLife / unstable_cacheTag (déprécié Next 16, stable maintenant)
import { unstable_cacheLife as cacheLife } from 'next/cache'
```

```typescript
// ✅ Server Action qui invalide un tag avec profile (signature Next 16)
'use server'
export async function publish(id: string) { ... ; revalidateTag('resources', 'max') }

// ❌ revalidateTag avec un seul argument (déprécié Next 16)
revalidateTag('resources')
```

```typescript
// ✅ generateStaticParams + dynamicParams false pour 404 strict
export async function generateStaticParams() {
  const items = await getItems()
  return items.map(item => ({ slug: item.slug }))
}

export const dynamicParams = false
```
