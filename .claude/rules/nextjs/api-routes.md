---
paths:
  - "src/app/api/**/route.ts"
---

# Next.js — API Route Handlers

## À faire
- Exporter des fonctions nommées par méthode HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`) dans `route.ts`
- Toujours `await params` dans les route handlers dynamiques (`[id]`) : `Promise` obligatoire
- Utiliser `NextResponse.json(data, { status })` pour retourner du JSON avec un status HTTP
- Extraire le body manuellement via `await request.json()`, `await request.formData()` ou `await request.text()` selon le `Content-Type`
- Défaut attendu sur un `GET` route handler : dynamic (exécuté à chaque requête). Pour cacher la réponse côté serveur, extraire la lecture dans une fonction helper avec `'use cache'` + `cacheLife()` + `cacheTag()` et l'appeler depuis le handler (la directive `'use cache'` ne peut pas être posée dans le body du handler lui-même)
- Retourner `export const runtime = 'nodejs'` pour les routes qui touchent Prisma (Node runtime requis pour le driver PG)
- Centraliser les headers CORS dans un objet réutilisable et créer un handler `OPTIONS` pour les requêtes préflight
- Valider toute entrée utilisateur avec Zod avant usage (mêmes règles que les Server Actions)
- Écouter `request.signal` (abort event) pour nettoyer les streams quand le client se déconnecte

## À éviter
- Créer un `route.ts` et un `page.tsx` au même niveau de route (conflit de résolution)
- Accéder synchronement à `params` : hard error Next 16
- Combiner `Access-Control-Allow-Origin: *` avec `Access-Control-Allow-Credentials: true` (incompatibles, CORS bloqué)
- `await` la boucle dans le `start()` d'un `ReadableStream` pour SSE : bloque le retour de la réponse, lancer le travail async en background
- Utiliser `export const dynamic = 'force-static' | 'force-dynamic' | ...` dans un projet où `cacheComponents: true` est activé dans `next.config.ts` : **incompatible**, throw au build (cf. `nextjs/configuration.md` et `nextjs/rendering-caching.md`)

## Gotchas
- Next 15 breaking change : les `GET` route handlers ne sont **plus cachés par défaut**, exécution per-request par défaut
- Avec `cacheComponents: true` (config projet recommandée), le segment config `dynamic` est supprimé/interdit : utiliser la directive `'use cache'` dans une fonction helper pour opt-in au caching serveur, ou laisser le comportement dynamique par défaut et s'appuyer sur `Cache-Control` côté client/CDN
- SSE derrière Nginx : `X-Accel-Buffering: no` obligatoire dans les headers pour désactiver le buffering du proxy
- `cookies()` / `headers()` de `next/headers` sont async dans les route handlers (hard error Next 16 si sync)

## Exemples
```typescript
// ✅ GET dynamique avec params async (Next 16 hard error si sync)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json({ id })
}

// ❌ accès synchrone à params (hard error Next 16)
export async function GET(request, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id })
}
```

```typescript
// ✅ SSE : ne pas await la boucle dans start(), écouter request.signal pour cleanup
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => { ... }, 1000)
      request.signal.addEventListener('abort', () => clearInterval(interval))
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // Nginx
    },
  })
}
```
