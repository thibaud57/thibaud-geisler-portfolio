---
paths:
  - "src/app/api/**/route.ts"
  - "src/app/admin/**/route.ts"
---

# Next.js — API Route Handlers

## À faire
- Exporter des fonctions nommées par méthode HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) dans `route.ts`
- Toujours `await params` dans les route handlers dynamiques (`[id]`, `[...path]`) : `Promise` obligatoire
- Retourner du JSON par `NextResponse.json(data, { status })`
- Extraire le body selon le `Content-Type` : `await request.json()`, `await request.formData()` ou `await request.text()`
- Forcer l'exécution à chaque requête d'un `GET` qui ne lit ni la requête ni une donnée non cachée par **`await connection()`** : sous `cacheComponents`, un tel `GET` est prérendu au build comme une page. Pour cacher côté serveur, extraire la lecture dans un helper `'use cache'` + `cacheLife()` + `cacheTag()` appelé par le handler : la directive ne se pose pas dans le body du handler
- Typer le second argument par **`RouteContext<'/route'>`** (helper global de `typedRoutes`), pas par une interface locale
- Valider toute entrée utilisateur avec Zod avant usage (mêmes règles que les Server Actions)

## À éviter
- Créer un `route.ts` et un `page.tsx` au même niveau de route (conflit de résolution)
- Accéder synchroniquement à `params` : hard error Next 16
- Poser `export const dynamic` ou `export const runtime` : **incompatibles** avec `cacheComponents: true`, throw au build. Le runtime reste Node.js par défaut, suffisant pour Prisma

## Gotchas
- Next 15 a cessé de cacher les `GET` par défaut, mais `cacheComponents` prérend tout `GET` sans lecture runtime : `/api/health` sortait `○` (Static) au rapport de build de Next 16.4 avant son `await connection()`
- `cookies()` / `headers()` de `next/headers` sont async dans les route handlers (hard error Next 16 si sync)
- Le projet n'a ni CORS ni SSE (`docs/ARCHITECTURE.md`) : si un client tiers apparaît, centraliser les en-têtes CORS et ne jamais combiner `Access-Control-Allow-Origin: *` avec `Allow-Credentials: true` ; pour du SSE, écouter `request.signal` pour libérer le flux et ne pas `await` la boucle dans `start()`

## Exemples
```typescript
// ✅ GET dynamique avec params async, typé par RouteContext
export async function GET(_request: NextRequest, { params }: RouteContext<'/api/items/[id]'>) {
  const { id } = await params
  return NextResponse.json({ id })
}

// ❌ accès synchrone à params (hard error Next 16)
export async function GET(_request, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id })
}
```
