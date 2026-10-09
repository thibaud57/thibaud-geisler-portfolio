---
paths:
  - "src/app/**/{page,layout,template,loading,error,not-found,default}.tsx"
---

# Next.js — Routing & Navigation

## À faire
- Toujours `await params` et `await searchParams` dans les pages, layouts, route handlers et `generateMetadata` (Promise obligatoire)
- Typer pages, layouts et route handlers par les helpers globaux que génère `typedRoutes` : `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`, jamais par un type de `params` écrit à la main
- Utiliser le route group `(public)/` pour partager un layout sans affecter l'URL. `admin/` est un **segment réel** : il produit l'URL `/admin` (ADR-021)
- Ne pas poser `generateStaticParams` sur `/projets/[slug]` : sans lui, les paramètres sont des données de requête, la page passe la promesse `params` à un composant sous `<Suspense>` et se rend à la première visite, puis est servie du disque. La coquille servie à l'instant d'une première visite dépend de `partialPrefetching: true` : sans lui, la requête attend le rendu complet. Avec `cacheComponents`, un `generateStaticParams` ne peut pas rendre un tableau vide et un paramètre fictif est déconseillé par Next : le build ne doit pas dépendre de la base ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md)). Les métadonnées des crawlers HTML-only sont couvertes par `htmlLimitedBots`, cf. `nextjs/metadata-seo.md`. `dynamicParams` ne doit PAS être exporté (build cassé avec `cacheComponents`)
- Retourner `notFound()` côté serveur quand une ressource Prisma n'existe pas : consommé par `not-found.tsx` le plus proche
- Utiliser `redirect()` (307) et `permanentRedirect()` (308) dans Server Components et Route Handlers. Dans une Server Action, `redirect()` déclenche une navigation client quand JavaScript est disponible, un 303 seulement sans JavaScript
- Appeler `unstable_rethrow(error)` dans tout `try/catch` qui pourrait avaler `redirect()`, `notFound()`, `unauthorized()` ou `forbidden()`
- Faire `error.tsx` et `global-error.tsx` en Client Components (`'use client'`), `global-error.tsx` doit inclure `<html>` et `<body>`. Brancher le bouton de nouvel essai sur la prop **`retry`**, qui re-fetch et re-rend le segment, Server Components compris : `reset` ne vide que l'état d'erreur
- Wrapper `useSearchParams()` dans un `<Suspense>` au niveau page, sinon erreur au build sur les pages statiques
- Utiliser `<Link href>` pour la navigation client-side (prefetch auto, pas de full reload, state des layouts préservé)
- Construire les liens actifs manuellement avec `usePathname()` dans un Client Component

## À éviter
- Accéder synchronement à `params`/`searchParams`/`cookies()`/`headers()` : hard error en Next 16
- Utiliser `<Link legacyBehavior>` ou `passHref` avec un `<a>` enfant : supprimé en Next 16
- Mettre `redirect()` dans un `try/catch` sans `unstable_rethrow` : l'erreur interne est silencieusement capturée
- Créer un `page.tsx` et un `route.ts` au même niveau de route : conflit de résolution
- Utiliser `useRouter`, `usePathname`, `useSearchParams` dans un Server Component (hooks Client Component uniquement)

## Gotchas
- **Next 16.4 : strict route matching par défaut**. Une URL qui ne forme pas un arbre de routes complet est rejetée, les pages inatteignables sont signalées au build, les catch-all incomplets élagués. Échappatoire temporaire : `deprecated.looseRouteMatching: true`. Le rewrite du proxy vers un chemin sans page (slug projet inconnu, servi en 404 par `global-not-found`) passe le build : revérifier son 404 à chaque montée de Next
- Next 16 : `default.tsx` est **obligatoire** (hard error au build) pour chaque parallel route `@slot`, retourner `null` si aucun slot actif
- Next 15 → 16 : `params` et `searchParams` passent de warning à hard error si accès synchrone
- Un layout ne se re-rend pas quand on navigue entre ses pages enfants (state et DOM préservés)
- `unauthorized()` et `forbidden()` nécessitent `experimental: { authInterrupts: true }` dans `next.config.ts`
- `error.tsx` catche les erreurs du `page.tsx` et de ses enfants, **pas** celles du `layout.tsx` du même niveau (utiliser `global-error.tsx` pour ça)

## Exemples
```typescript
// ✅ Dynamic route : params async, typé par le helper global de typedRoutes
export default async function Page({ params }: PageProps<'/items/[slug]'>) {
  const { slug } = await params
  const item = await getItem(slug)
  if (!item) notFound()
  return <View item={item} />
}

// ❌ accès synchrone à params (hard error Next 16)
export default function Page({ params }: { params: { slug: string } }) {
  return <View slug={params.slug} />
}
```

```typescript
// ✅ unstable_rethrow dans try/catch qui pourrait avaler notFound/redirect
async function getItem(id: string) {
  try {
    const data = await fetchItem(id)
    if (!data) notFound()
    return data
  } catch (error) {
    unstable_rethrow(error) // re-throw notFound/redirect avant tout
    throw error
  }
}

// ❌ try/catch qui avale silencieusement notFound() / redirect()
async function getItem(id: string) {
  try {
    const data = await fetchItem(id)
    if (!data) notFound() // avalé par le catch
    return data
  } catch (e) { return null }
}
```
