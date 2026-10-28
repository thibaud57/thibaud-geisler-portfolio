---
paths:
  - "src/app/**/{page,layout,template,loading,error,not-found}.tsx"
---

# Next.js : routing et navigation

## À faire
- Toujours `await params` et `await searchParams` dans les pages, layouts, route handlers et `generateMetadata` (Promise obligatoire, accès synchrone en hard error Next 16, comme `cookies()` et `headers()`)
- Typer pages, layouts et route handlers par les helpers globaux que génère `typedRoutes` : `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`, jamais par un type de `params` écrit à la main
- Utiliser le route group `(public)/` pour partager un layout sans affecter l'URL. `admin/` est un **segment réel** : il produit l'URL `/admin` (ADR-021)
- Ne pas poser `generateStaticParams` sur `/projets/[slug]` (build sans base, cf. `nextjs/rendering-caching.md`) : la page passe la promesse `params` à un composant sous `<Suspense>`, rendu à la première visite puis servi du disque. La coquille servie à cette première visite dépend de `partialPrefetching: true`, sans lequel la requête attend le rendu complet. Avec `cacheComponents`, un `generateStaticParams` ne peut pas rendre un tableau vide et `dynamicParams` ne doit PAS être exporté (build cassé)
- Retourner `notFound()` côté serveur quand une ressource Prisma n'existe pas : consommé par `not-found.tsx` le plus proche
- Utiliser `redirect()` (307) et `permanentRedirect()` (308) dans Server Components et Route Handlers. Dans une Server Action, `redirect()` déclenche une navigation client quand JavaScript est disponible, un 303 seulement sans JavaScript
- Appeler `unstable_rethrow(error)` dans tout `try/catch` qui pourrait avaler `redirect()`, `notFound()`, `unauthorized()` ou `forbidden()`
- Faire `error.tsx` et `global-error.tsx` en Client Components (`'use client'`), `global-error.tsx` doit inclure `<html>` et `<body>`. Brancher le bouton de nouvel essai sur la prop **`retry`**, qui re-fetch et re-rend le segment, Server Components compris : `reset` ne vide que l'état d'erreur
- Wrapper `useSearchParams()` dans un `<Suspense>` au niveau page, sinon erreur au build sur les pages statiques

## À éviter
- Utiliser `<Link legacyBehavior>` ou `passHref` avec un `<a>` enfant : supprimé en Next 16
- Créer un `page.tsx` et un `route.ts` au même niveau de route : conflit de résolution

## Gotchas
- **Next 16.4 : strict route matching par défaut**. Une URL qui ne forme pas un arbre de routes complet est rejetée, les pages inatteignables sont signalées au build, les catch-all incomplets élagués. Échappatoire temporaire : `deprecated.looseRouteMatching: true`. Le rewrite du proxy vers un chemin sans page (slug projet inconnu, servi en 404 par `global-not-found`) passe le build : revérifier son 404 à chaque montée de Next
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
